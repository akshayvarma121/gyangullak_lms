import { LedgerEvent } from './schema.ts';
import { canonicalize } from '../crypto/canonical.ts';
import { hashString, verify } from '../crypto/ed25519.ts';

export function getEventHash(event: LedgerEvent): string {
  const clone = { ...event };
  return hashString(canonicalize(clone));
}

export function getSignableMessage(
  event: Omit<LedgerEvent, 'signature'>,
): string {
  return canonicalize(event);
}

export function verifyEventSignature(
  event: LedgerEvent,
  publicKeyHex: string,
): boolean {
  const { signature, ...rest } = event;
  const msg = getSignableMessage(rest);
  return verify(signature, msg, publicKeyHex);
}

export function verifyEventChain(
  events: LedgerEvent[],
  devicePublicKeyHex: string,
): LedgerEvent | null {
  let expectedPrevHash: string | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!verifyEventSignature(event, devicePublicKeyHex)) {
      return event;
    }
    if (event.prev_hash !== expectedPrevHash) {
      return event;
    }
    expectedPrevHash = getEventHash(event);
  }
  return null;
}
