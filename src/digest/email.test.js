import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigest } from "./email.js";

const profile = { digest_time: "07:15:00", time_zone: "Europe/London" };
const appUrl = "https://app.example.com";

const story = (id) => ({
  id,
  title: `Story ${id}`,
  summary: "Made-up summary.",
  source: "news.example.com",
  date: "2026-10-29T16:19:00Z",
});

const lists = [
  { id: "list-1", name: "Regulators", newCount: 7, problemCount: 3, stories: [1, 2, 3, 4, 5].map(story) },
  { id: "list-2", name: "Climate", newCount: 1, problemCount: 0, stories: [story(6)] },
  { id: "list-3", name: "Quiet", newCount: 0, problemCount: 0, stories: [] },
  { id: "list-4", name: "Broken", newCount: 0, problemCount: 1, stories: [] },
];

test("the subject counts new stories and the lists that have them", () => {
  assert.equal(buildDigest({ lists, profile, appUrl }).subject, "Wirescout: 8 new stories in 2 watch lists");
  assert.equal(buildDigest({ lists: [lists[1]], profile, appUrl }).subject, "Wirescout: 1 new story in 1 watch list");
});

test("each list shows its new stories and failing sources, linking into the app", () => {
  const { html, text } = buildDigest({ lists, profile, appUrl });

  assert.match(html, /Regulators<\/a>\s*<span[^>]*>· 7 new stories/);
  assert.match(html, /href="https:\/\/app\.example\.com\/lists\/list-1\?tab=sources"[^>]*>⚠︎ 3 problematic sources/);
  assert.match(html, /href="https:\/\/app\.example\.com\/lists\/list-1\/stories\/1"/);
  assert.match(html, /href="https:\/\/app\.example\.com\/lists\/list-1"[^>]*>See all new stories on Wirescout/);
  assert.match(html, /29 Oct, 16:19/);
  assert.doesNotMatch(html, /news\.example\.com\//, "no link to the source site");

  assert.match(text, /REGULATORS · 7 new stories/);
  assert.match(text, /⚠︎ 3 problematic sources: https:\/\/app\.example\.com\/lists\/list-1\?tab=sources/);
  assert.match(text, /Change the time or turn it off: https:\/\/app\.example\.com\/settings\/digest/);
});

test("a list with failing sources but nothing new still shows, without See all", () => {
  const { html } = buildDigest({ lists, profile, appUrl });
  assert.match(html, /Broken<\/a>\s*<span[^>]*>· No new stories/);
  assert.match(html, /1 problematic source</);
  assert.doesNotMatch(html, /lists\/list-4"[^>]*>See all/);
});

test("a list with nothing new and nothing failing is left out", () => {
  const { html, text } = buildDigest({ lists, profile, appUrl });
  assert.doesNotMatch(html, /Quiet/);
  assert.doesNotMatch(text, /QUIET/);
});

test("text from the sources is escaped and long summaries are cut at a word", () => {
  const risky = { ...story(9), title: '<script>alert("x")</script> & co', summary: `${"word ".repeat(60)}end` };
  const { html } = buildDigest({ lists: [{ ...lists[1], stories: [risky] }], profile, appUrl });
  assert.match(html, /&#60;script&#62;alert\(&#34;x&#34;\)&#60;\/script&#62; &#38; co/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /word word…/);
  assert.doesNotMatch(html, /end</);
});

test("the footer names the time and time zone", () => {
  const { html } = buildDigest({ lists, profile, appUrl });
  assert.match(html, /Sent Monday to Friday at 07:15 \(Europe\/London\)\./);
});
