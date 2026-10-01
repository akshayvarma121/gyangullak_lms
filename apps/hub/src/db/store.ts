import { LedgerStore } from '@chalk/core';
import { LedgerEvent } from '@chalk/core';
import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDb() {
  if (db) return db;
  db = await Database.load('sqlite:hub.db');
  
  // Ledger events table
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
    )
  `);

  // Students roster table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS roster (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      confirmed_balance INTEGER DEFAULT 0
    )
  `);

  // Key-value settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Catalog items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      points_cost INTEGER NOT NULL,
      stock INTEGER NOT NULL
    )
  `);
  
  // Skill mastery table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS skill_mastery (
      student_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      last_attempt TEXT,
      PRIMARY KEY (student_id, skill_id)
    )
  `);
  
  // Skills table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  // Points History table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS points_history (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Guardians table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS guardians (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL UNIQUE,
      phone_number TEXT NOT NULL,
      has_consent INTEGER NOT NULL DEFAULT 0,
      consent_timestamp TEXT
    )
  `);

  return db;
}

export async function setSetting(key: string, value: string) {
  if (!db) throw new Error('DB not initialized');
  await db.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`, [key, value]);
}

export async function getSetting(key: string): Promise<string | null> {
  if (!db) throw new Error('DB not initialized');
  const rows = await db.select<any[]>(`SELECT value FROM settings WHERE key = $1`, [key]);
  if (rows.length === 0) return null;
  return rows[0].value;
}

export class SQLiteLedgerStore implements LedgerStore {
  async appendEvent(event: LedgerEvent): Promise<void> {
    if (!db) throw new Error('DB not initialized');
    await db.execute(
      `INSERT INTO ledger_events 
      (id, student_id, device_id, seq, prev_hash, kind, payload, client_ts, content_version, signature, sync_status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [
        event.id,
        event.student_id,
        event.device_id,
        event.seq,
        event.prev_hash,
        event.kind,
        JSON.stringify(event.payload),
        event.client_ts,
        event.content_version,
        event.signature,
      ]
    );
  }

  async listUnsynced(limit: number): Promise<LedgerEvent[]> {
    if (!db) throw new Error('DB not initialized');
    const rows = await db.select<any[]>(
      `SELECT * FROM ledger_events WHERE sync_status = 'pending' ORDER BY seq ASC LIMIT $1`, 
      [limit]
    );
    
    return rows.map(r => ({
      ...r,
      payload: JSON.parse(r.payload),
    }));
  }

  async markSynced(eventIds: string[]): Promise<void> {
    if (!db || eventIds.length === 0) return;
    const placeholders = eventIds.map((_, i) => `$${i + 1}`).join(',');
    await db.execute(`UPDATE ledger_events SET sync_status = 'synced' WHERE id IN (${placeholders})`, eventIds);
  }

  async getLastEvent(): Promise<LedgerEvent | null> {
    if (!db) throw new Error('DB not initialized');
    const rows = await db.select<any[]>(`SELECT * FROM ledger_events ORDER BY seq DESC LIMIT 1`);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      payload: JSON.parse(r.payload),
    };
  }
}

export const dbStore = new SQLiteLedgerStore();
