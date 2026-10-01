import { LedgerEvent } from '../events/schema.js';
import { LedgerStore } from './store.js';

export type SyncState = 'idle' | 'syncing' | 'backoff' | 'offline' | 'error';

export interface Transport {
  sendBatch(events: LedgerEvent[]): Promise<{
    accepted: string[];
    rejected: { id: string; reason: string }[];
  }>;
  isOnline(): boolean;
}

export interface Clock {
  now(): number;
}

export interface RNG {
  random(): number;
}

export class SyncMachine {
  public state: SyncState = 'idle';
  private backoffDelayMs = 1000;
  private readonly MAX_BACKOFF = 60000;

  constructor(
    private store: LedgerStore,
    private transport: Transport,
    private rng: RNG,
    private batchSize: number = 50,
  ) {}

  async run(): Promise<void> {
    if (this.state === 'syncing' || this.state === 'backoff') return;

    if (!this.transport.isOnline()) {
      this.state = 'offline';
      return;
    }

    this.state = 'syncing';

    try {
      const unsynced = await this.store.listUnsynced(this.batchSize);

      if (unsynced.length === 0) {
        this.state = 'idle';
        this.resetBackoff();
        return;
      }

      const response = await this.transport.sendBatch(unsynced);

      const idsToMark = [
        ...response.accepted,
        ...response.rejected.map((r) => r.id),
      ];

      if (idsToMark.length > 0) {
        await this.store.markSynced(idsToMark);
      }

      this.resetBackoff();
      this.state = 'idle';
    } catch {
      this.state = 'backoff';
      this.increaseBackoff();
    }
  }

  private resetBackoff() {
    this.backoffDelayMs = 1000;
  }

  private increaseBackoff() {
    this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, this.MAX_BACKOFF);
    const jitter = this.rng.random() * 0.1 * this.backoffDelayMs;
    this.backoffDelayMs += jitter;
  }

  getBackoffDelay(): number {
    return this.backoffDelayMs;
  }
}
