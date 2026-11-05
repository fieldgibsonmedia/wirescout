import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, deletePerson, peopleIds, queries, runQueries, storyIds } from "./posthog.js";

const ANN = "00000000-0000-0000-0000-0000000000a1";
const GONE = "00000000-0000-0000-0000-0000000000a2";

// A made-up PostHog: answers each query by the section name in its body, and records the calls.
function fakePostHog(answer) {
  const calls = [];
  let running = 0;
  let mostAtOnce = 0;
  return {
    calls,
    mostAtOnce: () => mostAtOnce,
    posthog: {
      projectId: "123",
      apiKey: "made-up-key",
      fetch: async (url, options) => {
        calls.push({ url, options, body: JSON.parse(options.body) });
        running++;
        mostAtOnce = Math.max(mostAtOnce, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return answer(JSON.parse(options.body));
      },
    },
  };
}

test("the queries cover the chosen period", () => {
  const week = queries(7);
  assert.deepEqual(Object.keys(week), ["activeUsers", "topPages", "topFeatures", "topStories", "errors", "replays"]);
  for (const query of Object.values(week)) assert.match(query, /interval 7 day/);
  for (const query of Object.values(queries(null))) assert.doesNotMatch(query, /interval/, "All: no time limit");
  assert.match(week.topFeatures, /'sources_added', 'story_shared', 'draft_sent'/);
  assert.match(week.topFeatures, /group by event, list_kind/, "Documents lists' use is its own row");
});

test("queries go to PostHog's EU API with the key, at most 3 at once", async () => {
  const fake = fakePostHog(() => Response.json({ results: [] }));
  const answers = await runQueries(fake.posthog, queries(30));

  assert.equal(fake.calls.length, 6);
  assert.equal(fake.calls[0].url, "https://eu.posthog.com/api/projects/123/query/");
  assert.equal(fake.calls[0].options.headers.Authorization, "Bearer made-up-key");
  assert.equal(fake.calls[0].body.query.kind, "HogQLQuery");
  for (const call of fake.calls) assert.equal(call.body.refresh, "force_blocking", "never PostHog's saved answer");
  assert.ok(fake.mostAtOnce() <= 3);
  assert.deepEqual(answers.errors, []);
});

test("a query that fails leaves the others", async () => {
  const fake = fakePostHog(({ query }) =>
    query.query.includes("$exception") ? new Response("Bad query", { status: 400 }) : Response.json({ results: [["x", 1, 1]] }),
  );
  const answers = await runQueries(fake.posthog, queries(1));
  assert.equal(answers.errors, null);
  assert.deepEqual(answers.topFeatures, [["x", 1, 1]]);
});

test("the report adds names and story titles, and links replays to PostHog", () => {
  const answers = {
    activeUsers: [
      [ANN, 4, 30, "2026-11-04T10:00:00Z"],
      [GONE, 1, 2, "2026-11-01T10:00:00Z"],
    ],
    topPages: [["watch-list", 20, 2]],
    topFeatures: [["story_shared", "documents", 3, 1]],
    topStories: [[42, 2, 1]],
    errors: [["", 2, 1, "2026-11-04T09:00:00Z"]],
    replays: [["session-1", ANN, "2026-11-04T09:00:00Z", 150000]],
  };
  assert.deepEqual(peopleIds(answers), [ANN, GONE]);
  assert.deepEqual(storyIds(answers), [42]);

  const report = buildReport(answers, {
    people: new Map([[ANN, { name: "Ann Example", email: "ann@example.com" }]]),
    stories: new Map([[42, { title: "Green bonds", url: "https://news.example.com/1", source: "news.example.com" }]]),
    projectId: "123",
  });

  assert.deepEqual(report.activeUsers[0], { name: "Ann Example", email: "ann@example.com", days: 4, pages: 30, lastSeen: "2026-11-04T10:00:00Z" });
  assert.equal(report.activeUsers[1].name, "A former user");
  assert.deepEqual(report.topFeatures[0], { event: "story_shared", listKind: "documents", times: 3, people: 1 });
  assert.deepEqual(report.topStories[0], { title: "Green bonds", url: "https://news.example.com/1", source: "news.example.com", shares: 2, drafts: 1 });
  assert.equal(report.errors[0].message, "Unknown error");
  assert.deepEqual(report.replays[0], {
    name: "Ann Example",
    startedAt: "2026-11-04T09:00:00Z",
    activeMinutes: 3,
    url: "https://eu.posthog.com/project/123/replay/session-1",
  });
});

test("a section PostHog couldn't answer stays empty, not wrong", () => {
  const report = buildReport({ activeUsers: null, replays: null }, { people: new Map(), stories: new Map(), projectId: "123" });
  assert.equal(report.activeUsers, null);
  assert.equal(report.replays, null);
  assert.deepEqual(peopleIds({ activeUsers: null, replays: null }), []);
});

test("deleting a person asks PostHog to delete their events and replays too", async () => {
  const fake = fakePostHog(() => Response.json({ persons_queued_for_deletion: 1 }, { status: 202 }));
  assert.equal(await deletePerson(fake.posthog, ANN), true);
  assert.equal(fake.calls[0].url, "https://eu.posthog.com/api/projects/123/persons/bulk_delete/");
  assert.deepEqual(fake.calls[0].body, { distinct_ids: [ANN], delete_events: true, delete_recordings: true });

  const down = fakePostHog(() => {
    throw new Error("offline");
  });
  assert.equal(await deletePerson(down.posthog, ANN), false);
});
