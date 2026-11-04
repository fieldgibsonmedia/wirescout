// Reads a source the user just added, once, and saves its stories and status, so a new watch list shows
// stories right away instead of after the next hourly scan. The app calls it with { source_id }, one source
// per call: the free plan gives each call 2 seconds of processing, and one big news page can take most of it.
// Signed-in users only, for a source in one of their own watch lists that hasn't been checked yet or failed its last check.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { isPublicAddress } from "../../../src/scanner/check-link.js";
import { checkSource } from "../../../src/scanner/check-source.js";

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    const { source_id } = await request.json().catch(() => ({}));
    if (typeof source_id !== "string") {
      return Response.json({ error: "Send { source_id }." }, { status: 400 });
    }

    // Row-level security shows only the user's own watch lists' sources.
    const { data: followed } = await ctx.supabase.from("watch_list_sources").select("source_id").eq("source_id", source_id).limit(1);
    if (!followed?.length) {
      return Response.json({ error: "Source not found." }, { status: 404 });
    }

    const { data: source } = await ctx.supabaseAdmin
      .from("sources")
      .select("id, url, feed_url, read_from, stories_found, last_checked_at")
      .eq("id", source_id)
      .single();
    // Working already: the hourly scan keeps it up to date. A source that failed its last check is read again:
    // the app's link check just passed. A private address is never fetched from here.
    if (!source || (source.last_checked_at && source.stories_found) || !isPublicAddress(source.url)) {
      return Response.json({ found: source?.stories_found ?? 0 });
    }

    const result = await checkSource(ctx.supabaseAdmin, source);
    return Response.json({ found: result.found });
  }),
};
