// Checks links before they're added to a watch list: the app calls it with up to 10 links at a time
// and gets back, for each one, null if it works or why it doesn't. Signed-in users only.
// It runs the scanner's own reading code, so a link is judged the same way as in the hourly scan.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { checkLink } from "../../../src/scanner/check-link.js";

// The free plan gives each call 2 seconds of processing: reading 10 pages fits, 100 might not.
const MAX_LINKS = 10;

export default {
  fetch: withSupabase({ auth: "user" }, async (request) => {
    const { urls } = await request.json().catch(() => ({}));
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > MAX_LINKS || urls.some((url) => typeof url !== "string")) {
      return Response.json({ error: `Send 1 to ${MAX_LINKS} links as { urls: [...] }.` }, { status: 400 });
    }

    // The links are checked at the same time, so a call takes as long as its slowest link.
    return Response.json({ results: await Promise.all(urls.map(checkLink)) });
  }),
};
