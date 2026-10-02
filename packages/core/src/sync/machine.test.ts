import { describe, it, expect, vi } from 'vitest';
import { SyncMachine, Transport, RNG } from './machine.ts';
import { InMemoryLedgerStore } from './store.ts';
import { LedgerEvent } from '../events/schema.ts';

describe('SyncMachine', () => {
  const dummyEvent: LedgerEvent = {
    id: 'e1',
    student_id: 's1',
    device_id: 'd1',
    seq: 0,
    prev_hash: null,
    kind: 'device.claim',
    payload: { link_code: 'abc' },
    client_ts: '2024-01-01T00:00:00Z',
    content_version: 'v1',
    signature: 'sig',
  };

  it('should transition to offline if transport is not online', async () => {
    const store = new InMemoryLedgerStore();
    const transport: Transport = {
      isOnline: () => false,
      sendBatch: (events) => Promise.resolve(vi.fn()(events)),
    };
    const rng: RNG = { random: () => 0.5 };
    const machine = new SyncMachine(store, transport, rng);
    await machine.run();

    expect(machine.state).toBe('offline');
  });

  it('should stay idle if no unsynced events', async () => {
    const store = new InMemoryLedgerStore();
    const transport: Transport = {
      isOnline: () => true,
      sendBatch: (events) => Promise.resolve(vi.fn()(events)),
    };
    const machine = new SyncMachine(
      store,
      transport,
      { random: () => 0.5 },
    );
    await machine.run();

    expect(machine.state).toBe('idle');
  });

  it('should sync events and mark as synced', async () => {
    const store = new InMemoryLedgerStore();
    await store.appendEvent(dummyEvent);

    const mockSend = vi
      .fn()
      .mockResolvedValue({ accepted: ['e1'], rejected: [] });
    const transport: Transport = {
      isOnline: () => true,
      sendBatch: (events) => Promise.resolve(mockSend(events)),
    };

    const machine = new SyncMachine(
      store,
      transport,
      { random: () => 0.5 },
    );
    await machine.run();

    expect(machine.state).toBe('idle');
    expect(mockSend).toHaveBeenCalledTimes(1);

    const unsynced = await store.listUnsynced(10);
    expect(unsynced.length).toBe(0);
  });

  it('should handle partial rejection', async () => {
    const store = new InMemoryLedgerStore();
    await store.appendEvent(dummyEvent);
    const event2 = { ...dummyEvent, id: 'e2' };
    await store.appendEvent(event2);

    const mockSend = vi.fn().mockResolvedValue({
      accepted: ['e1'],
      rejected: [{ id: 'e2', reason: 'invalid' }],
    });
    const transport: Transport = {
      isOnline: () => true,
      sendBatch: (events) => Promise.resolve(mockSend(events)),
    };

    const machine = new SyncMachine(
      store,
      transport,
      { random: () => 0.5 },
    );
    await machine.run();

    expect(machine.state).toBe('idle');

    // rejected events should also be marked synced so they aren't retried infinitely
    const unsynced = await store.listUnsynced(10);
    expect(unsynced.length).toBe(0);
  });

  it('should enter backoff state and increase backoff on network failure', async () => {
    const store = new InMemoryLedgerStore();
    await store.appendEvent(dummyEvent);

    const transport: Transport = {
      isOnline: () => true,
      sendBatch: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const machine = new SyncMachine(
      store,
      transport,
      { random: () => 0.5 },
    ); // Jitter max is 10%

    await machine.run();
    expect(machine.state).toBe('backoff');
    // Initial delay 1000, doubled to 2000, plus 5% jitter (random=0.5 -> 0.05 * 2000 = 100)
    expect(machine.getBackoffDelay()).toBe(2100);

    // Ensure unsynced is still there
    const unsynced = await store.listUnsynced(10);
    expect(unsynced.length).toBe(1);
  });
});
