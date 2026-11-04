// Settings → Manager → Analytics: usage for the chosen period, read from PostHog with the personal API key
// (POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID), which never reaches the browser. PostHog only knows user ids:
// names and story titles come from our database. Super admins only. The code is in src/analytics/posthog.js.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { buildReport, peopleIds, PERIODS, queries, runQueries, storyIds } from "../../../src/analytics/posthog.js";
import { reply } from "../_shared/magazines.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    const admin = ctx.supabaseAdmin;

    const { data: me } = await admin.from("profiles").select("is_super_admin").eq("id", ctx.userClaims!.id).single();
    if (!me?.is_super_admin) return reply(403, { error: "Only super admins see analytics." });

    const posthog = {
      projectId: Deno.env.get("POSTHOG_PROJECT_ID"),
      apiKey: Deno.env.get("POSTHOG_PERSONAL_API_KEY"),
      host: Deno.env.get("POSTHOG_HOST"),
    };
    if (!posthog.projectId || !posthog.apiKey) return reply(503, { error: "Analytics isn't set up yet." });

    const { period } = await request.json().catch(() => ({}));
    if (!Object.hasOwn(PERIODS, period)) return reply(400, { error: "Pick a period." });
    const days = PERIODS[period as keyof typeof PERIODS];

    const answers = await runQueries(posthog, queries(days));

    const ids = peopleIds(answers);
    const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const people = new Map((profiles ?? []).map((profile) => [profile.id, { name: profile.full_name?.trim() || profile.email, email: profile.email }]));

    const articleIds = storyIds(answers);
    const { data: articles } = articleIds.length
      ? await admin.from("articles").select("id, title, url, sources (url, name)").in("id", articleIds)
      : { data: [] };
    const stories = new Map(
      (articles ?? []).map((article) => [
        article.id,
        { title: article.title, url: article.url, source: article.sources?.name ?? new URL(article.sources?.url ?? article.url).hostname.replace(/^www\./, "") },
      ]),
    );

    return reply(200, buildReport(answers, { people, stories, projectId: posthog.projectId }));
  }),
};
