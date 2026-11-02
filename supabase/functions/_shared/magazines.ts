// Shared by the post-to-MODX functions (docs/post-to-modx-plan.md): the site registry, the stored
// connection and the publish log. They all use the secret-key client: users can't write these tables.
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSession } from "../../../src/publish/session-crypto.js";

export type Site = {
  id: number;
  name: string;
  cms_url: string;
  article_parent_id: number;
  article_template_id: number;
};

// A magazine that is set up for posting through MODX, or null.
export async function loadSite(admin: SupabaseClient, publicationId: unknown): Promise<Site | null> {
  if (!Number.isInteger(publicationId)) return null;
  const { data } = await admin
    .from("publications")
    .select("id, name, cms_url, article_parent_id, article_template_id")
    .eq("id", publicationId)
    .eq("cms", "modx")
    .maybeSingle();
  return data;
}

// The user's stored connection to a magazine, with its session unlocked, or null.
// A session that can't be unlocked (e.g. the key changed) counts as no connection: the user signs in again.
export async function loadConnection(admin: SupabaseClient, userId: string, publicationId: number) {
  const { data } = await admin
    .from("magazine_connections")
    .select("cms_username, session_ciphertext, status")
    .eq("user_id", userId)
    .eq("publication_id", publicationId)
    .maybeSingle();
  if (!data) return null;
  try {
    const session = await decryptSession(Deno.env.get("MAGAZINE_SESSION_KEY"), data.session_ciphertext);
    return { cmsUsername: data.cms_username as string, status: data.status as string, session };
  } catch {
    return { cmsUsername: data.cms_username as string, status: "needs_sign_in", session: null };
  }
}

export async function markNeedsSignIn(admin: SupabaseClient, userId: string, publicationId: number) {
  await admin
    .from("magazine_connections")
    .update({ status: "needs_sign_in" })
    .eq("user_id", userId)
    .eq("publication_id", publicationId);
}

type LogEntry = {
  user_id: string;
  publication_id: number;
  action: "connect" | "disconnect" | "post_draft" | "draft_text";
  result: "ok" | "refused" | "error";
  article_id?: number;
  cms_resource_id?: number;
  ai_assisted?: boolean;
};

export async function logPublish(admin: SupabaseClient, entry: LogEntry) {
  await admin.from("publish_log").insert(entry);
}

export function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}
