// Sends a story to a magazine as an unpublished MODX draft, as the journalist's own account
// (docs/post-to-modx-plan.md). Body: { article_id, publication_id, title, content, ai_assisted }.
// title and content are what the journalist sees in the Send dialog: what is sent is what they see.
// Answers { id, edit_url } or { error, status: "needs_sign_in" }. Signed-in users only.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createDraft, editLink } from "../../../src/publish/modx.js";
import { draftHtml } from "../../../src/publish/draft.js";
import { loadConnection, loadSite, logPublish, markNeedsSignIn, reply } from "../_shared/magazines.ts";

// MODX keeps a page title in 255 characters.
const MAX_TITLE_LENGTH = 255;

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    const body = await request.json().catch(() => ({}));
    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!title || title.length > MAX_TITLE_LENGTH || !content) {
      return reply(400, { error: `Enter a title (up to ${MAX_TITLE_LENGTH} characters) and the text.` });
    }

    // Only a story the user can see: row-level security limits articles to the sources in their lists.
    const { data: article } = await ctx.supabase.from("articles").select("id").eq("id", body.article_id).maybeSingle();
    if (!article) return reply(404, { error: "Story not found." });

    const site = await loadSite(admin, body.publication_id);
    if (!site) return reply(400, { error: "Unknown magazine." });

    const connection = await loadConnection(admin, userId, site.id);
    if (!connection?.session || connection.status !== "connected") {
      return reply(409, { status: "needs_sign_in", error: `Sign in to ${site.name} again to send this draft.` });
    }

    const draft = await createDraft(site, connection.session, { title, content: draftHtml(content) });
    await logPublish(admin, {
      user_id: userId,
      publication_id: site.id,
      article_id: article.id,
      action: "post_draft",
      result: draft.ok ? "ok" : draft.reason === "error" ? "error" : "refused",
      cms_resource_id: draft.ok ? draft.id : undefined,
      ai_assisted: body.ai_assisted === true,
    });

    if (!draft.ok && draft.reason === "signed_out") {
      await markNeedsSignIn(admin, userId, site.id);
      return reply(409, { status: "needs_sign_in", error: `Sign in to ${site.name} again to send this draft.` });
    }
    // A refusal is shown as MODX words it, e.g. no permission to create documents in that section.
    if (!draft.ok) return reply(draft.reason === "refused" ? 422 : 502, { error: draft.message });

    await admin
      .from("magazine_connections")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("publication_id", site.id);
    return reply(200, { id: draft.id, edit_url: editLink(site, draft.id) });
  }),
};
