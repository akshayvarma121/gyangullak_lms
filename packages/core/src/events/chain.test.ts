import { describe, it, expect } from 'vitest';
import {
  verifyEventChain,
  verifyEventSignature,
  getEventHash,
  getSignableMessage,
} from './chain.js';
import { LedgerEvent, LedgerEventSchema } from './schema.js';
import { generateKeypair, sign } from '../crypto/ed25519.js';

describe('Event Chain', () => {
  it('should parse valid schema', () => {
    const res = LedgerEventSchema.safeParse({
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
    });
    expect(res.success).toBe(true);
  });

  it('should verify event signature and chain correctly', () => {
    const deviceKeys = generateKeypair();
    const event1: Omit<LedgerEvent, 'signature'> = {
      id: 'e1',
      student_id: 's1',
      device_id: 'd1',
      seq: 0,
      prev_hash: null,
      kind: 'device.claim',
      payload: { link_code: 'abc' },
      client_ts: '2024-01-01T00:00:00Z',
      content_version: 'v1',
    };
    const e1: LedgerEvent = {
      ...event1,
      signature: sign(getSignableMessage(event1), deviceKeys.privateKey),
    };

    const hash1 = getEventHash(e1);

    const event2: Omit<LedgerEvent, 'signature'> = {
      id: 'e2',
      student_id: 's1',
      device_id: 'd1',
      seq: 1,
      prev_hash: hash1,
      kind: 'quiz.attempt',
      payload: { quiz_id: 'q1', answers: {} },
      client_ts: '2024-01-01T00:01:00Z',
      content_version: 'v1',
    };
    const e2: LedgerEvent = {
      ...event2,
      signature: sign(getSignableMessage(event2), deviceKeys.privateKey),
    };

    expect(verifyEventSignature(e1, deviceKeys.publicKey)).toBe(true);
    expect(verifyEventSignature(e2, deviceKeys.publicKey)).toBe(true);

    expect(verifyEventChain([e1, e2], deviceKeys.publicKey)).toBeNull(); // No errors
  });

  it('should fail if signature is invalid', () => {
    const deviceKeys = generateKeypair();
    const event1: LedgerEvent = {
      id: 'e1',
      student_id: 's1',
      device_id: 'd1',
      seq: 0,
      prev_hash: null,
      kind: 'device.claim',
      payload: { link_code: 'abc' },
      client_ts: '2024-01-01T00:00:00Z',
      content_version: 'v1',
      signature: 'bad',
    };

    expect(verifyEventSignature(event1, deviceKeys.publicKey)).toBe(false);
    expect(verifyEventChain([event1], deviceKeys.publicKey)).toEqual(event1);
  });

  it('should fail if prev_hash breaks chain due to reordering', () => {
    const deviceKeys = generateKeypair();
    const event1: Omit<LedgerEvent, 'signature'> = {
      id: 'e1',
      student_id: 's1',
      device_id: 'd1',
      seq: 0,
      prev_hash: null,
      kind: 'device.claim',
      payload: { link_code: 'abc' },
      client_ts: '2024-01-01T00:00:00Z',
      content_version: 'v1',
    };
    const e1: LedgerEvent = {
      ...event1,
      signature: sign(getSignableMessage(event1), deviceKeys.privateKey),
    };
    const hash1 = getEventHash(e1);

    const event2: Omit<LedgerEvent, 'signature'> = {
      id: 'e2',
      student_id: 's1',
      device_id: 'd1',
      seq: 1,
      prev_hash: hash1,
      kind: 'quiz.attempt',
      payload: { quiz_id: 'q1', answers: {} },
      client_ts: '2024-01-01T00:01:00Z',
      content_version: 'v1',
    };
    const e2: LedgerEvent = {
      ...event2,
      signature: sign(getSignableMessage(event2), deviceKeys.privateKey),
    };

    // Reordered
    expect(verifyEventChain([e2, e1], deviceKeys.publicKey)).toEqual(e2);
  });
});
