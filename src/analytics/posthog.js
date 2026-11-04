// Reads and deletes usage data in PostHog (EU) with the personal API key, for the analytics and delete-account
// functions: the key never reaches the browser. The app sends the data (src/app/lib/analytics.ts).
// Each section of the report is its own query, so one that fails leaves the others.

const HOST = "https://eu.posthog.com";

// The periods the Analytics screen offers, in days back from now. all: everything PostHog has.
export const PERIODS = { day: 1, week: 7, month: 30, half_year: 182, year: 365, all: null };

// The events the app sends for its main features (AnalyticsEvent in src/app/lib/analytics.ts).
export const FEATURES = [
  "sources_added",
  "story_shared",
  "draft_sent",
  "search",
  "story_saved",
  "digest_link_opened",
  "settings_changed",
];

// PostHog runs at most 3 queries at once per project.
const PARALLEL_QUERIES = 3;
// Rows per section.
const LIMIT = 50;

// The report's HogQL queries, for the last `days` days, or everything when days is null.
// days comes from PERIODS, never from the request.
export function queries(days) {
  const since = days ? `timestamp > now() - interval ${days} day` : "true";
  const replaysSince = days ? `min_first_timestamp > now() - interval ${days} day` : "true";
  return {
    activeUsers: `select distinct_id, count(distinct toDate(timestamp)) as days, count() as pages, max(timestamp) as last_seen
      from events where event = '$pageview' and ${since}
      group by distinct_id order by days desc, pages desc limit ${LIMIT}`,
    topPages: `select properties.screen as screen, count() as views, count(distinct distinct_id) as people
      from events where event = '$pageview' and ${since}
      group by screen order by views desc limit ${LIMIT}`,
    topFeatures: `select event, count() as times, count(distinct distinct_id) as people
      from events where event in (${FEATURES.map((name) => `'${name}'`).join(", ")}) and ${since}
      group by event order by times desc`,
    topStories: `select toInt(properties.article_id) as article_id, countIf(event = 'story_shared') as shares,
        countIf(event = 'draft_sent') as drafts
      from events where event in ('story_shared', 'draft_sent') and properties.article_id is not null and ${since}
      group by article_id order by shares + drafts desc limit 10`,
    errors: `select JSONExtractString(properties.$exception_list, 1, 'value') as message, count() as times,
        count(distinct distinct_id) as people, max(timestamp) as last_seen
      from events where event = '$exception' and ${since}
      group by message order by times desc limit ${LIMIT}`,
    replays: `select session_id, any(distinct_id) as distinct_id, min(min_first_timestamp) as started_at,
        sum(active_milliseconds) as active_ms
      from raw_session_replay_events where ${replaysSince}
      group by session_id order by started_at desc limit ${LIMIT}`,
  };
}

// posthog: { projectId, apiKey }, plus host only to point at a local stand-in while testing (POSTHOG_HOST),
// and fetch only in tests.
function request(posthog, path, body) {
  return (posthog.fetch ?? fetch)(`${posthog.host || HOST}/api/projects/${posthog.projectId}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${posthog.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Runs every query, a few at a time. Each answer is its rows, or null if that query failed.
export async function runQueries(posthog, named) {
  const entries = Object.entries(named);
  const answers = {};
  let next = 0;
  async function worker() {
    while (next < entries.length) {
      const [name, query] = entries[next++];
      try {
        const response = await request(posthog, "query/", { query: { kind: "HogQLQuery", query } });
        answers[name] = response.ok ? (await response.json()).results : null;
      } catch {
        answers[name] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_QUERIES }, worker));
  return answers;
}

// The user ids the report needs names for (PostHog only knows ids).
export function peopleIds(answers) {
  const ids = [...(answers.activeUsers ?? []).map((row) => row[0]), ...(answers.replays ?? []).map((row) => row[1])];
  return [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/.test(id));
}

export function storyIds(answers) {
  return (answers.topStories ?? []).map((row) => row[0]).filter(Number.isInteger);
}

// The report: each section's rows, or null if it couldn't be read.
// people: Map of user id → { name, email }; stories: Map of story id → { title, url, source }.
export function buildReport(answers, { people, stories, projectId }) {
  const person = (id) => people.get(id) ?? { name: "A former user", email: "" };
  const map = (rows, shape) => (rows ? rows.map(shape) : null);
  return {
    activeUsers: map(answers.activeUsers, ([id, days, pages, lastSeen]) => ({ ...person(id), days, pages, lastSeen })),
    topPages: map(answers.topPages, ([screen, views, people]) => ({ screen: screen ?? "", views, people })),
    topFeatures: map(answers.topFeatures, ([event, times, people]) => ({ event, times, people })),
    topStories: map(answers.topStories, ([id, shares, drafts]) => ({
      ...(stories.get(id) ?? { title: "A story no longer in Wirescout", url: "", source: "" }),
      shares,
      drafts,
    })),
    errors: map(answers.errors, ([message, times, people, lastSeen]) => ({ message: message || "Unknown error", times, people, lastSeen })),
    replays: map(answers.replays, ([sessionId, id, startedAt, activeMs]) => ({
      name: person(id).name,
      startedAt,
      activeMinutes: Math.round(activeMs / 60000),
      url: `${HOST}/project/${projectId}/replay/${encodeURIComponent(sessionId)}`,
    })),
  };
}

// Deletes a person and everything PostHog recorded about them (events and replays), when they delete their account.
// PostHog does it in the background. Returns whether PostHog took the request.
export async function deletePerson(posthog, userId) {
  try {
    const response = await request(posthog, "persons/bulk_delete/", {
      distinct_ids: [userId],
      delete_events: true,
      delete_recordings: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
