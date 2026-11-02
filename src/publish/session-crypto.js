// Locks a MODX session before it's saved in magazine_connections, and unlocks it to use it.
// AES-256-GCM with the function secret MAGAZINE_SESSION_KEY (32 random bytes, base64): a database copy
// alone is useless, and a changed ciphertext fails to unlock instead of giving a wrong session.
// Web Crypto, so the same code runs in the Edge Functions (Deno) and the tests (Node).

const IV_BYTES = 12;

export async function encryptSession(keyBase64, session) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await importKey(keyBase64), plaintext);
  // The IV isn't secret, but each one must be used once: it's stored in front of the ciphertext.
  return toBase64(new Uint8Array([...iv, ...new Uint8Array(ciphertext)]));
}

// Throws if the key is wrong or the ciphertext was changed.
export async function decryptSession(keyBase64, stored) {
  const bytes = fromBase64(stored);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, IV_BYTES) },
    await importKey(keyBase64),
    bytes.slice(IV_BYTES),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function importKey(keyBase64) {
  const key = fromBase64(keyBase64 ?? "");
  if (key.length !== 32) throw new Error("MAGAZINE_SESSION_KEY must be 32 bytes, base64.");
  return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}
