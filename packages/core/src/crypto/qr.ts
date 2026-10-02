import { sign, verify } from './ed25519.ts';
import { canonicalize } from './canonical.ts';

export interface QRTokenPayload {
  school_id: string;
  student_id: string;
  issued_at: string;
}

export interface SignedQRToken {
  payload: QRTokenPayload;
  signature: string;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binaryStr = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export function generateQRToken(
  payload: QRTokenPayload,
  schoolPrivateKeyHex: string,
): string {
  const msg = canonicalize(payload);
  const signature = sign(msg, schoolPrivateKeyHex);
  const token: SignedQRToken = { payload, signature };
  const tokenStr = JSON.stringify(token);
  return base64urlEncode(new TextEncoder().encode(tokenStr));
}

export function verifyQRToken(
  tokenString: string,
  schoolPublicKeyHex: string,
): QRTokenPayload | null {
  try {
    const decodedBytes = base64urlDecode(tokenString);
    const decodedStr = new TextDecoder().decode(decodedBytes);
    const token = JSON.parse(decodedStr) as SignedQRToken;

    const msg = canonicalize(token.payload);
    if (verify(token.signature, msg, schoolPublicKeyHex)) {
      return token.payload;
    }
    return null;
  } catch {
    return null;
  }
}

const LINK_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export function generateLinkCode(seed: Uint8Array): string {
  if (seed.length < 4) throw new Error('Seed too short');
  let code = '';
  let val = (seed[0] << 24) | (seed[1] << 16) | (seed[2] << 8) | seed[3];
  val = Math.abs(val);
  for (let i = 0; i < 6; i++) {
    code += LINK_ALPHABET[val % LINK_ALPHABET.length];
    val = Math.floor(val / LINK_ALPHABET.length);
  }
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    sum += LINK_ALPHABET.indexOf(code[i]);
  }
  const checksum = LINK_ALPHABET[sum % LINK_ALPHABET.length];
  return code + checksum;
}
