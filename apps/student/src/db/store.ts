import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { LedgerStore } from '@chalk/core';
import type { LedgerEvent } from '@chalk/core';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

export async function initDb() {
  if (db) return db;
  db = await sqlite.createConnection('chalk_student', false, 'no-encryption', 1, false);
  await db.open();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledger_events (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      prev_hash TEXT,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      client_ts TEXT NOT NULL,
      content_version TEXT NOT NULL,
      signature TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      device_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content (
      version TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `);
  return db;
}

export class SQLiteLedgerStore implements LedgerStore {
  async getLastEvent(): Promise<LedgerEvent | null> {
    if (!db) throw new Error('DB not initialized');
    const res = await db.query('SELECT * FROM ledger_events ORDER BY seq DESC LIMIT 1');
    if (res.values && res.values.length > 0) {
      const row = res.values[0];
      return {
        ...row,
        payload: JSON.parse(row.payload)
      } as LedgerEvent;
    }
    return null;
  }

  async appendEvent(event: LedgerEvent): Promise<void> {
    if (!db) throw new Error('DB not initialized');
    await db.run(
      'INSERT INTO ledger_events (id, student_id, device_id, seq, prev_hash, kind, payload, client_ts, content_version, signature, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [event.id, event.student_id, event.device_id, event.seq, event.prev_hash, event.kind, JSON.stringify(event.payload), event.client_ts, event.content_version, event.signature, 'pending']
    );
  }

  async listUnsynced(limit: number): Promise<LedgerEvent[]> {
    if (!db) throw new Error('DB not initialized');
    const res = await db.query("SELECT * FROM ledger_events WHERE sync_status = 'pending' ORDER BY seq ASC LIMIT ?", [limit]);
    if (!res.values) return [];
    return res.values.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    })) as LedgerEvent[];
  }

  async markSynced(eventIds: string[]): Promise<void> {
    if (!db) throw new Error('DB not initialized');
    if (eventIds.length === 0) return;
    const placeholders = eventIds.map(() => '?').join(',');
    await db.run(`UPDATE ledger_events SET sync_status = 'synced' WHERE id IN (${placeholders})`, eventIds);
  }
}

export const dbStore = new SQLiteLedgerStore();
