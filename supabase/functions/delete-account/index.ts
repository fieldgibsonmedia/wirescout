// Deletes the signed-in user's own account and everything in it (Account settings → Delete account).
// Only the server may delete an account. Their MODX sessions are ended first, so no signed-in session is left
// behind on a magazine. Deleting the user removes their profile, and with it their watch lists (and the saved
// stories in them), magazine connections and usage (the database's "on delete cascade"). Shared sources and
// their stories stay: other lists may follow them. The publish log stays without the person, so colleagues still
// see "A former colleague already sent this story". Signed-in users only.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { logout } from "../../../src/publish/modx.js";
import { loadConnection, loadSite, reply } from "../_shared/magazines.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (_request, ctx) => {
    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    const { data: connections } = await admin.from("magazine_connections").select("publication_id").eq("user_id", userId);
    for (const { publication_id } of connections ?? []) {
      const site = await loadSite(admin, publication_id);
      const connection = site && (await loadConnection(admin, userId, site.id));
      // A magazine that doesn't answer doesn't stop the deletion: its session expires on its own.
      if (site && connection?.session) await logout(site, connection.session);
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return reply(500, { error: "Your account couldn't be deleted. Please try again." });
    return reply(200, { status: "deleted" });
  }),
};
