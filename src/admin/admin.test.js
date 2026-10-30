import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAccessRequestsEmail, buildUsageReport } from "./emails.js";
import { nextMonth, reportMonth, reportMonths } from "./months.js";

test("the report covers the month before, and the 6 months up to it", () => {
  assert.equal(reportMonth(new Date("2026-11-01T00:40:00Z")), "2026-10");
  assert.equal(reportMonth(new Date("2027-01-15T10:00:00Z")), "2026-12", "across the new year");
  assert.deepEqual(reportMonths("2026-10"), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(reportMonths("2027-02"), ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
  assert.equal(nextMonth("2026-10"), "2026-11");
  assert.equal(nextMonth("2026-12"), "2027-01");
});

const months = reportMonths("2026-10");
const people = [
  { name: "Ann Example", email: "ann@example.com", activeDays: { "2026-09": 4 }, shares: 0, digestClicks: 0 },
  { name: "Bea Example", email: "bea@example.com", activeDays: { "2026-10": 12, "2026-09": 20 }, shares: 3, digestClicks: 5 },
];
const topStories = [{ title: "Green <bond> story", url: "https://news.example.com/1", source: "news.example.com", shares: 2 }];

test("the usage report shows active days as bars, most active first", () => {
  const { subject, html, text } = buildUsageReport({ months, people, topStories });

  assert.equal(subject, "Wirescout usage: October 2026");
  assert.ok(html.indexOf("Bea Example") < html.indexOf("Ann Example"), "most active last month first");
  assert.match(html, /<td width="36" height="8" bgcolor="#0071e3"/, "12 days, 3 px a day");
  assert.match(html, />May<\/th>.*>Oct<\/th>/s);
  assert.match(text, /Bea Example: May 0, Jun 0, Jul 0, Aug 0, Sept 20, Oct 12; 3 shares, 5 digest clicks/);
});

test("the usage report lists the most shared stories, escaped", () => {
  const { html, text } = buildUsageReport({ months, people, topStories });
  assert.match(html, /Green &#60;bond&#62; story<\/a>/);
  assert.match(html, /news\.example\.com · shared 2 times/);
  assert.match(text, /1\. Green <bond> story \(news\.example\.com\), shared 2 times/);

  const quiet = buildUsageReport({ months, people, topStories: [] });
  assert.match(quiet.html, /No stories shared in October 2026\./);
});

test("the access request email lists each request", () => {
  const { subject, text } = buildAccessRequestsEmail([
    { name: "Cat Example", email: "cat@example.com", reason: "New reporter", created_at: "2026-10-30T11:05:00Z" },
  ]);
  assert.equal(subject, "Wirescout: 1 new access request");
  assert.match(text, /Name: Cat Example\nEmail: cat@example\.com\nReason: New reporter\nAsked: 30 Oct, 11:05 \(London\)/);
  assert.match(text, /allowed_email_domains/);
});
