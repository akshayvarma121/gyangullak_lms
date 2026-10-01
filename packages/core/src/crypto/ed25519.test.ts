import { describe, it, expect } from 'vitest';
import { generateKeypair, sign, verify, hashString } from './ed25519.js';

describe('ed25519 helpers', () => {
  it('should generate valid keypair', () => {
    const keys = generateKeypair();
    expect(keys.privateKey).toBeTruthy();
    expect(keys.publicKey).toBeTruthy();
  });

  it('should sign and verify correctly', () => {
    const keys = generateKeypair();
    const msg = 'hello world';
    const sig = sign(msg, keys.privateKey);
    expect(verify(sig, msg, keys.publicKey)).toBe(true);
  });

  it('should fail verification with wrong message', () => {
    const keys = generateKeypair();
    const msg = 'hello world';
    const sig = sign(msg, keys.privateKey);
    expect(verify(sig, 'wrong message', keys.publicKey)).toBe(false);
  });

  it('should fail verification with wrong signature', () => {
    const keys = generateKeypair();
    const msg = 'hello world';
    // modify sig slightly by changing a char (hex)
    const sig = sign(msg, keys.privateKey);
    const badSig = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
    expect(verify(badSig, msg, keys.publicKey)).toBe(false);
  });

  it('should produce consistent sha256 hash', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
    expect(hashString('hello')).not.toBe(hashString('world'));
  });
});
