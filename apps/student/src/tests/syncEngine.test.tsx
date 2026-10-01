import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncEngine } from '../sync/engine';
import { dbStore } from '../db/store';
import { Preferences } from '@capacitor/preferences';

// Mock Network and App from Capacitor
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
    addListener: vi.fn(),
  }
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
  }
}));

// Mock fetch
const originalFetch = global.fetch;

describe('SyncEngine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    syncEngine.machine.state = 'idle';
    
    // Default online
    vi.mocked(Preferences.get).mockImplementation(async (options) => {
      if (options.key === 'device_id') return { value: 'dev-1' };
      if (options.key === 'sync_cursor') return { value: '0' };
      if (options.key === 'last_sync_time') return { value: '1000' };
      return { value: null };
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllTimers();
  });

  const createFakeEvents = (count: number): any[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `evt-${i}`,
      student_id: 's1',
      device_id: 'dev-1',
      seq: i,
      prev_hash: null,
      kind: 'quiz.attempt' as const,
      payload: {},
      client_ts: new Date().toISOString(),
      content_version: 'v1',
      signature: 'sig',
      sync_status: 'pending'
    }));
  };

  it('syncs events successfully and updates balance', async () => {
    let unsyncedEvents = createFakeEvents(3);
    vi.spyOn(dbStore, 'listUnsynced').mockImplementation(async () => unsyncedEvents);
    vi.spyOn(dbStore, 'markSynced').mockImplementation(async (ids) => {
      unsyncedEvents = unsyncedEvents.filter(e => !ids.includes(e.id));
    });

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sync-push')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 'evt-0', status: 'accepted' },
              { id: 'evt-1', status: 'accepted' },
              { id: 'evt-2', status: 'rejected', reason: 'already counted' }
            ]
          })
        };
      }
      if (url.includes('sync-pull')) {
        return {
          ok: true,
          json: async () => ({ confirmed_balance: 150, cursor: 5 })
        };
      }
    });

    await syncEngine.triggerSync();

    // Verify events were pulled and marked
    expect(dbStore.markSynced).toHaveBeenCalledWith(['evt-0', 'evt-1', 'evt-2']);
    
    // Verify rejection string stored
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'rejection_evt-2', value: 'already counted' });

    // Verify balance updated
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'confirmed_balance', value: '150' });
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'sync_cursor', value: '5' });
  });

  it('handles server 500s by backing off without marking events', async () => {
    const unsyncedEvents = createFakeEvents(2);
    vi.spyOn(dbStore, 'listUnsynced').mockImplementation(async () => unsyncedEvents);
    vi.spyOn(dbStore, 'markSynced').mockImplementation(async () => undefined);

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sync-push')) {
        return { ok: false, status: 500 };
      }
    });

    vi.useFakeTimers();

    const p = syncEngine.triggerSync();
    await p;

    // No events should be marked as synced
    expect(dbStore.markSynced).not.toHaveBeenCalled();

    // Backoff should be engaged
    expect(syncEngine.machine.state).toBe('backoff');
    
    vi.useRealTimers();
  });

  it('handles mid-batch connectivity loss', async () => {
    const unsyncedEvents = createFakeEvents(100);
    // Sync machine batch size is 50. So it takes 2 loops.
    // 1st loop returns 100 unsynced (machine pulls 50)
    // We simulate fetch throwing TypeError (network error) on 1st batch
    
    vi.spyOn(dbStore, 'listUnsynced').mockImplementation(async () => unsyncedEvents.slice(0, 50));
    vi.spyOn(dbStore, 'markSynced').mockImplementation(async () => undefined);

    global.fetch = vi.fn().mockImplementation(async () => {
      throw new TypeError('Failed to fetch'); // Simulate network failure
    });

    await syncEngine.triggerSync();

    expect(dbStore.markSynced).not.toHaveBeenCalled();
    expect(syncEngine.machine.state).toBe('backoff'); // It transitions to backoff due to network error
  });

  it('never loses an unsynced event across multiple flaky pushes', async () => {
    const unsyncedEvents = createFakeEvents(3);
    let attempts = 0;

    vi.spyOn(dbStore, 'listUnsynced').mockImplementation(async () => {
      return unsyncedEvents;
    });

    vi.spyOn(dbStore, 'markSynced').mockImplementation(async (ids: string[]) => {
      // Remove from unsynced array
      for (const id of ids) {
        const idx = unsyncedEvents.findIndex(e => e.id === id);
        if (idx !== -1) unsyncedEvents.splice(idx, 1);
      }
    });

    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url.includes('sync-push')) {
        attempts++;
        if (attempts === 1) {
          throw new TypeError('Network error');
        }
        if (attempts === 2) {
          return { ok: false, status: 500 };
        }
        if (attempts === 3) {
          const body = JSON.parse(opts.body);
          const accepted = [body.events[0].id, body.events[1].id];
          return {
            ok: true,
            json: async () => ({ results: accepted.map(id => ({ id, status: 'accepted' })) })
          };
        }
        if (attempts === 4) {
          const body = JSON.parse(opts.body);
          const accepted = [body.events[0].id];
          return {
            ok: true,
            json: async () => ({ results: accepted.map(id => ({ id, status: 'accepted' })) })
          };
        }
      }
      return { ok: true, json: async () => ({ confirmed_balance: 150 }) };
    });

    // Attempt 1: Network Error -> Backoff
    await syncEngine.triggerSync();
    expect(unsyncedEvents.length).toBe(3);

    // Reset machine state to force another try
    syncEngine.machine.state = 'idle';

    // Attempt 2: 500 Error -> Backoff
    await syncEngine.triggerSync();
    expect(unsyncedEvents.length).toBe(3);

    syncEngine.machine.state = 'idle';

    // Attempt 3: Partial success (2 events)
    await syncEngine.triggerSync();
    // Wait, the while loop in triggerSync will continue if machine state is idle!
    // Since attempt 3 was successful, it will pull the remaining 1 event immediately in the same triggerSync call!
    // So attempt 4 will happen automatically!

    expect(unsyncedEvents.length).toBe(0);
  });
});
