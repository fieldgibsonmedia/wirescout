import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAccessRequestsEmail } from "./emails.js";

test("the access request email lists each request", () => {
  const { subject, text } = buildAccessRequestsEmail([
    { name: "Cat Example", email: "cat@example.com", reason: "New reporter", created_at: "2026-10-30T11:05:00Z" },
  ]);
  assert.equal(subject, "Wirescout: 1 new access request");
  assert.match(text, /Name: Cat Example\nEmail: cat@example\.com\nReason: New reporter\nAsked: 30 Oct, 11:05 \(London\)/);
  assert.match(text, /Settings → Manager → System settings → Platform access → Add/, "lets them in through the app");
  assert.doesNotMatch(text, /allowed_email_domains/);
});
