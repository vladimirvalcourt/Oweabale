/**
 * AES-256-GCM for OAuth refresh tokens at rest.
 * Set Edge secret EMAIL_TOKEN_ENCRYPTION_KEY = base64-encoded 32 bytes.
 */
const ALGO = 'AES-GCM';
const IV_LEN = 12;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: ALGO, length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext: string, keyB64: string): Promise<string> {
  const raw = b64ToBytes(keyB64.trim());
  if (raw.length !== 32) throw new Error('EMAIL_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
  const key = await importKey(raw);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc),
  );
  const bundle = new Uint8Array(iv.length + ct.length);
  bundle.set(iv, 0);
  bundle.set(ct, iv.length);
  return bytesToB64(bundle);
}

export async function decryptSecret(bundleB64: string, keyB64: string): Promise<string> {
  const raw = b64ToBytes(keyB64.trim());
  if (raw.length !== 32) throw new Error('EMAIL_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
  const key = await importKey(raw);
  const all = b64ToBytes(bundleB64);
  const iv = all.slice(0, IV_LEN);
  const ct = all.slice(IV_LEN);
  const dec = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
  return new TextDecoder().decode(dec);
}
