import { describe, it, expect } from 'vitest';
import { generateKeypair } from './ed25519.ts';
import { generateQRToken, verifyQRToken, generateLinkCode } from './qr.ts';
import { hexToBytes } from '@noble/hashes/utils.js';

describe('QR and Link Code', () => {
  it('should generate and verify QR token', () => {
    const schoolKeys = generateKeypair();
    const payload = {
      school_id: 's1',
      student_id: 'u1',
      issued_at: '2024-01-01',
    };
    const token = generateQRToken(payload, schoolKeys.privateKey);
    expect(token).toBeTruthy();

    const verified = verifyQRToken(token, schoolKeys.publicKey);
    expect(verified).toEqual(payload);
  });

  it('should fail verification if tampered', () => {
    const schoolKeys = generateKeypair();
    const payload = {
      school_id: 's1',
      student_id: 'u1',
      issued_at: '2024-01-01',
    };
    const token = generateQRToken(payload, schoolKeys.privateKey);

    // tamper by decoding, changing a char, and re-encoding
    const bytes = Buffer.from(token, 'base64url');
    bytes[10] = (bytes[10] + 1) % 256;
    const tampered = bytes.toString('base64url');

    const verified = verifyQRToken(tampered, schoolKeys.publicKey);
    expect(verified).toBeNull();
  });

  it('should return null for malformed token string', () => {
    const schoolKeys = generateKeypair();
    expect(
      verifyQRToken('not a base64 string!!!', schoolKeys.publicKey),
    ).toBeNull();
  });

  it('should generate a 7 char link code', () => {
    const seed = hexToBytes('12345678');
    const code = generateLinkCode(seed);
    expect(code).toHaveLength(7);
    // Deterministic
    const code2 = generateLinkCode(seed);
    expect(code).toEqual(code2);
  });

  it('should throw if seed is too short', () => {
    expect(() => generateLinkCode(new Uint8Array(2))).toThrow('too short');
  });
});
