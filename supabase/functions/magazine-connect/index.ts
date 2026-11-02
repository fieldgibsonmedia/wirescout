// Connects a journalist's own MODX account on one magazine, or disconnects it (docs/post-to-modx-plan.md).
// Body: { action: "connect", publication_id, username, password } or { action: "disconnect", publication_id }.
// The password is used once to sign in and is never stored or logged: only the MODX session is kept,
// encrypted. Answers { status, cms_username } and never the session. Signed-in users only.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { login, logout } from "../../../src/publish/modx.js";
import { encryptSession } from "../../../src/publish/session-crypto.js";
import { loadConnection, loadSite, logPublish, reply } from "../_shared/magazines.ts";

// 3 wrong passwords, then a 15-minute wait: far below any magazine's own lockout (20 or 50 attempts),
// so Wirescout can never get a journalist blocked on their magazine.
const MAX_FAILED_CONNECTS = 3;
const WAIT_MINUTES = 15;

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    const body = await request.json().catch(() => ({}));
    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    const site = await loadSite(admin, body.publication_id);
    if (!site) return reply(400, { error: "Unknown magazine." });

    if (body.action === "disconnect") {
      const connection = await loadConnection(admin, userId, site.id);
      if (connection) {
        // End the session on the magazine too. If it had already expired, there's nothing to end.
        if (connection.session) await logout(site, connection.session);
        await admin.from("magazine_connections").delete().eq("user_id", userId).eq("publication_id", site.id);
        await logPublish(admin, { user_id: userId, publication_id: site.id, action: "disconnect", result: "ok" });
      }
      return reply(200, { status: "disconnected" });
    }

    if (body.action !== "connect") return reply(400, { error: "Send action connect or disconnect." });
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) return reply(400, { error: "Enter your username and password." });

    const since = new Date(Date.now() - WAIT_MINUTES * 60_000).toISOString();
    const { count } = await admin
      .from("publish_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("publication_id", site.id)
      .eq("action", "connect")
      .eq("result", "refused")
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_FAILED_CONNECTS) {
      return reply(429, { error: `Too many failed sign-ins. Try again in ${WAIT_MINUTES} minutes.` });
    }

    const signIn = await login(site, username, password);
    const result = signIn.ok ? "ok" : signIn.reason === "error" ? "error" : "refused";
    await logPublish(admin, { user_id: userId, publication_id: site.id, action: "connect", result });
    if (!signIn.ok) return reply(result === "refused" ? 422 : 502, { error: signIn.message });

    // Signing in again (e.g. after "Needs sign-in") replaces the old connection: end its session first.
    const previous = await loadConnection(admin, userId, site.id);
    if (previous?.session) await logout(site, previous.session);

    const { error } = await admin.from("magazine_connections").upsert(
      {
        user_id: userId,
        publication_id: site.id,
        cms_username: username,
        session_ciphertext: await encryptSession(Deno.env.get("MAGAZINE_SESSION_KEY"), signIn.session),
        status: "connected",
        connected_at: new Date().toISOString(),
        last_used_at: null,
      },
      { onConflict: "user_id,publication_id" },
    );
    if (error) {
      await logout(site, signIn.session);
      // Own accounts only: the same MODX account can't be connected by two Wirescout users.
      if (error.code === "23505") {
        return reply(409, { error: `This ${site.name} account is already connected to another Wirescout user.` });
      }
      return reply(500, { error: "The connection couldn't be saved. Please try again." });
    }
    return reply(200, { status: "connected", cms_username: username });
  }),
};
