import { LedgerEvent } from '../events/schema.js';

export interface LedgerStore {
  appendEvent(event: LedgerEvent): Promise<void>;
  listUnsynced(limit: number): Promise<LedgerEvent[]>;
  markSynced(eventIds: string[]): Promise<void>;
  getLastEvent(): Promise<LedgerEvent | null>;
}

export class InMemoryLedgerStore implements LedgerStore {
  private events: LedgerEvent[] = [];
  private syncedIds: Set<string> = new Set();

  async appendEvent(event: LedgerEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  async listUnsynced(limit: number): Promise<LedgerEvent[]> {
    const unsynced = this.events.filter((e) => !this.syncedIds.has(e.id));
    return Promise.resolve(unsynced.slice(0, limit));
  }

  async markSynced(eventIds: string[]): Promise<void> {
    for (const id of eventIds) {
      this.syncedIds.add(id);
    }
    return Promise.resolve();
  }

  async getLastEvent(): Promise<LedgerEvent | null> {
    if (this.events.length === 0) return Promise.resolve(null);
    return Promise.resolve(this.events[this.events.length - 1]);
  }
}
