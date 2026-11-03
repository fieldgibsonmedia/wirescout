// Suggests the Send dialog's title and news brief for a story (docs/post-to-modx-plan.md, "The Send dialog"):
// it reads the story's page and asks Claude Haiku 5.5, using only what the page says.
// Body: { article_id, publication_id } (the magazine the draft is for). Answers { title, content, suggested, reason? }.
// If the page can't be read, the model writes from the story's own title and summary. If the model fails or the
// hourly limit is reached, it answers the story's own title and summary (suggested: false, with reason "limit" or
// "unavailable", which the Send dialog explains), so the journalist can always send. Each fallback's cause goes to
// the function's log, without the story. Signed-in users only.
import "@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "@anthropic-ai/sdk";
import { withSupabase } from "@supabase/server";
import { fetchStoryText, suggestDraft } from "../../../src/publish/draft.js";
import { comingSoon, loadSite, logPublish, reply } from "../_shared/magazines.ts";

// Keeps the model's cost bounded (under a cent each): a journalist sends a few drafts a day.
const MAX_SUGGESTIONS_PER_HOUR = 10;

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    const body = await request.json().catch(() => ({}));
    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    // Only a story the user can see: row-level security limits articles to the sources in their lists.
    const { data: story } = await ctx.supabase
      .from("articles")
      .select("id, title, summary, url")
      .eq("id", body.article_id)
      .maybeSingle();
    if (!story) return reply(404, { error: "Story not found." });

    const site = await loadSite(admin, body.publication_id);
    if (!site) return reply(400, { error: "Unknown magazine." });
    if (site.coming_soon) return comingSoon(site);

    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count } = await admin
      .from("publish_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "draft_text")
      .gte("created_at", since);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const overLimit = (count ?? 0) >= MAX_SUGGESTIONS_PER_HOUR;
    const allowed = apiKey && !overLimit;

    const client = allowed ? new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 }) : null;
    const pageText = allowed ? await fetchStoryText(story.url) : null;
    const { failure, ...draft } = await suggestDraft(client, story, pageText);
    if (allowed && !pageText) console.log("draft-text: the story page couldn't be read, so the model used the story's summary.");
    if (!draft.suggested) {
      console.error(`draft-text: used the story's own text (${overLimit ? "hourly limit" : !apiKey ? "no API key" : failure}).`);
    }

    // Only real attempts count towards the limit: the fallback costs nothing.
    if (allowed) {
      await logPublish(admin, {
        user_id: userId,
        publication_id: site.id,
        article_id: story.id,
        action: "draft_text",
        result: draft.suggested ? "ok" : "error",
      });
    }
    return reply(200, draft.suggested ? draft : { ...draft, reason: overLimit ? "limit" : "unavailable" });
  }),
};
