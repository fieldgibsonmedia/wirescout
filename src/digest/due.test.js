import { test } from "node:test";
import assert from "node:assert/strict";
import { isDue, safeTimeZone, since } from "./due.js";

const profile = { digest_time: "07:15:00", time_zone: "Europe/London", last_digest_at: null };

test("due once the chosen time has passed on a weekday", () => {
  // Friday 30 October 2026, London on GMT.
  assert.equal(isDue(profile, new Date("2026-10-30T07:14:00Z")), false);
  assert.equal(isDue(profile, new Date("2026-10-30T07:15:00Z")), true);
  assert.equal(isDue(profile, new Date("2026-10-30T16:00:00Z")), true, "a skipped run is caught up later that day");
});

test("never at weekends", () => {
  assert.equal(isDue(profile, new Date("2026-10-31T09:00:00Z")), false);
  assert.equal(isDue(profile, new Date("2026-11-01T09:00:00Z")), false);
});

test("never when the digest is off", () => {
  assert.equal(isDue({ ...profile, digest_time: null }, new Date("2026-10-30T09:00:00Z")), false);
});

test("once a day", () => {
  const sentToday = { ...profile, last_digest_at: "2026-10-30T07:19:00Z" };
  assert.equal(isDue(sentToday, new Date("2026-10-30T15:00:00Z")), false);
  assert.equal(isDue(sentToday, new Date("2026-11-02T07:19:00Z")), true, "Monday after Friday's digest");
});

test("in the user's own time zone", () => {
  const newYork = { ...profile, time_zone: "America/New_York" };
  // 07:15 in New York is 11:15 UTC (EDT until 1 November 2026).
  assert.equal(isDue(newYork, new Date("2026-10-30T11:14:00Z")), false);
  assert.equal(isDue(newYork, new Date("2026-10-30T11:15:00Z")), true);
  // 23:30 UTC on Friday is still Friday in New York, but already Saturday in Tokyo.
  assert.equal(isDue({ ...profile, time_zone: "Asia/Tokyo" }, new Date("2026-10-30T23:30:00Z")), false);
  // Last digest on Thursday evening in New York, which was already Friday in UTC: Friday's is still due.
  const thursdayEvening = { ...newYork, last_digest_at: "2026-10-30T01:00:00Z" };
  assert.equal(isDue(thursdayEvening, new Date("2026-10-30T11:15:00Z")), true);
});

test("on the day the clocks change", () => {
  // Monday 30 March 2026: London has just moved to BST (UTC+1), so 07:15 is 06:15 UTC.
  assert.equal(isDue(profile, new Date("2026-03-30T06:14:00Z")), false);
  assert.equal(isDue(profile, new Date("2026-03-30T06:15:00Z")), true);
});

test("an unknown time zone counts as London", () => {
  assert.equal(safeTimeZone("Mars/Base"), "Europe/London");
  assert.equal(isDue({ ...profile, time_zone: "Mars/Base" }, new Date("2026-10-30T07:15:00Z")), true);
});

test("a digest looks back to the last one, at most 7 days", () => {
  const now = new Date("2026-10-30T07:15:00Z");
  assert.deepEqual(since({ ...profile, last_digest_at: "2026-10-29T07:15:00Z" }, now), new Date("2026-10-29T07:15:00Z"));
  assert.deepEqual(since(profile, now), new Date("2026-10-23T07:15:00Z"));
  assert.deepEqual(since({ ...profile, last_digest_at: "2026-09-01T07:15:00Z" }, now), new Date("2026-10-23T07:15:00Z"));
});
