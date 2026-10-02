import { describe, it, expect } from 'vitest';
import { InMemoryLedgerStore } from './store.ts';
import { LedgerEvent } from '../events/schema.ts';

describe('InMemoryLedgerStore', () => {
  const dummyEvent: LedgerEvent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    student_id: '550e8400-e29b-41d4-a716-446655440000',
    device_id: '550e8400-e29b-41d4-a716-446655440000',
    seq: 0,
    prev_hash: null,
    kind: 'device.claim',
    payload: { link_code: 'abc' },
    client_ts: '2024-01-01T00:00:00Z',
    content_version: 'v1',
    signature: 'sig',
  };

  it('should return null for getLastEvent on empty store', async () => {
    const store = new InMemoryLedgerStore();
    expect(await store.getLastEvent()).toBeNull();
  });

  it('should return the last event', async () => {
    const store = new InMemoryLedgerStore();
    await store.appendEvent(dummyEvent);
    expect(await store.getLastEvent()).toEqual(dummyEvent);
  });
});
