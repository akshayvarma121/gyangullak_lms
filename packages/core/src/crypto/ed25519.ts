import {
  hashes,
  utils,
  getPublicKey,
  sign as edSign,
  verify as edVerify,
} from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import {
  bytesToHex as toHex,
  hexToBytes as fromHex,
  utf8ToBytes,
} from '@noble/hashes/utils.js';

hashes.sha512 = sha512;

export function generateKeypair() {
  const privKey = utils.randomSecretKey();
  const pubKey = getPublicKey(privKey);
  return {
    privateKey: toHex(privKey),
    publicKey: toHex(pubKey),
  };
}

export function hashBytes(data: Uint8Array): string {
  return toHex(sha256(data));
}

export function hashString(data: string): string {
  return hashBytes(utf8ToBytes(data));
}

export function sign(message: string, privateKeyHex: string): string {
  const sig = edSign(utf8ToBytes(message), fromHex(privateKeyHex));
  return toHex(sig);
}

export function verify(
  signatureHex: string,
  message: string,
  publicKeyHex: string,
): boolean {
  try {
    return edVerify(
      fromHex(signatureHex),
      utf8ToBytes(message),
      fromHex(publicKeyHex),
    );
  } catch {
    return false;
  }
}
