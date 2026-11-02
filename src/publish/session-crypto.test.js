import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptSession, encryptSession } from "./session-crypto.js";

// Made-up keys for the tests only: 32 bytes each, base64.
const KEY = Buffer.alloc(32, 1).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 2).toString("base64");
const SESSION = { cookie: "PHPSESSID=made-up", token: "made-up-token" };

test("a locked session unlocks with the same key", async () => {
  const stored = await encryptSession(KEY, SESSION);
  assert.deepEqual(await decryptSession(KEY, stored), SESSION);
});

test("the stored text shows nothing of the session, and differs every time", async () => {
  const first = await encryptSession(KEY, SESSION);
  const second = await encryptSession(KEY, SESSION);
  assert.ok(!first.includes("made-up"));
  assert.notEqual(first, second);
});

test("a wrong key or a changed ciphertext fails instead of giving a wrong session", async () => {
  const stored = await encryptSession(KEY, SESSION);
  await assert.rejects(decryptSession(OTHER_KEY, stored));

  const bytes = Buffer.from(stored, "base64");
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(decryptSession(KEY, bytes.toString("base64")));
});

test("a missing or short key is refused", async () => {
  await assert.rejects(encryptSession(undefined, SESSION), /32 bytes/);
  await assert.rejects(encryptSession(Buffer.alloc(16).toString("base64"), SESSION), /32 bytes/);
});
