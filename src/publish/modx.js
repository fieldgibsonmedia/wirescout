// Talks to a magazine's MODX manager connector (connectors/index.php) as the journalist's own account,
// exactly as the manager page does. Proven against all 4 magazines in src/publish/modx-staging-test.js.
// Used by the magazine-connect and post-draft Edge Functions.
//
// site: a publications row ({ cms_url, article_parent_id, article_template_id }).
// session: { cookie, token }, from login. It's as powerful as a signed-in manager tab: keep it server-side.
//
// Every call returns { ok: true, ... } or { ok: false, reason, message }:
//   reason "signed_out": the session expired or was ended (HTTP 401): the journalist signs in again.
//   reason "refused": MODX said no (wrong password, no permission). message is MODX's words.
//   reason "duplicate" (createDraft only): the magazine already has an article with this web address, i.e. the
//     same title. existingId is that article's id when MODX names it.
//   reason "error": the site couldn't be reached or answered something unexpected.

const TIMEOUT_MS = 20_000;

// MODX's "remember me" keeps the session for a week or more, depending on the site's settings.
export async function login(site, username, password) {
  const result = await callConnector(site, "security/login", {
    login_context: "mgr",
    username,
    password,
    rememberme: "1",
  });
  if (!result.ok) return failure(result);

  const token = result.json.object?.token;
  const cookie = result.setCookies.map((value) => value.split(";")[0]).filter(Boolean).join("; ");
  if (!token || !cookie) return { ok: false, reason: "error", message: "The magazine didn't start a session." };
  return { ok: true, session: { cookie, token } };
}

// Ends the session on the magazine, so the stored copy stops working too.
export async function logout(site, session) {
  const result = await callConnector(site, "security/logout", {}, session);
  return result.ok ? { ok: true } : failure(result);
}

// Creates an unpublished draft in the magazine's draft section, with the article template.
// content is HTML. Returns { ok: true, id }.
export async function createDraft(site, session, { title, content }) {
  const result = await callConnector(
    site,
    "resource/create",
    {
      pagetitle: title,
      parent: String(site.article_parent_id),
      template: String(site.article_template_id),
      context_key: "web",
      published: "0",
      hidemenu: "1",
      content,
    },
    session,
  );
  if (!result.ok) {
    // MODX makes the web address from the title, so the same title means an article that may be the same story.
    const duplicate = result.fields?.find((field) => field.id === "alias" || field.id === "uri");
    if (!duplicate) return failure(result);
    const existingId = Number(duplicate.msg?.match(/\d+/)?.[0]) || null;
    return { ok: false, reason: "duplicate", existingId, message: result.message };
  }

  const id = Number(result.json.object?.id);
  if (!id) return { ok: false, reason: "error", message: "The magazine didn't return the new draft." };
  return { ok: true, id };
}

// Reads one resource, e.g. to check a draft. Returns { ok: true, resource }.
export async function getResource(site, session, id) {
  const result = await callConnector(site, "resource/get", { id: String(id) }, session);
  return result.ok ? { ok: true, resource: result.json.object } : failure(result);
}

// The draft's edit page in the MODX manager.
export function editLink(site, id) {
  return `${site.cms_url}/manager/?a=resource/update&id=${id}`;
}

// A failed call as callers see it: without MODX's field list, which only createDraft reads.
function failure({ reason, message }) {
  return { ok: false, reason, message };
}

async function callConnector(site, action, fields, session) {
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    // The manager sends this; without it MODX answers refusals as HTTP 200 with code 401 in the JSON.
    "x-requested-with": "XMLHttpRequest",
  };
  if (session) {
    headers.cookie = session.cookie;
    // PHP exposes this header as $_SERVER['HTTP_MODAUTH'], which is what MODX checks.
    headers.modAuth = session.token;
  }

  let response;
  let json = null;
  try {
    response = await fetch(`${site.cms_url}/connectors/index.php`, {
      method: "POST",
      headers,
      body: new URLSearchParams({ action, ctx: "mgr", ...fields }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    json = JSON.parse(await response.text());
  } catch {
    // Unreachable, too slow, or not JSON (e.g. a server error page).
    if (response?.status === 401) return { ok: false, reason: "signed_out", message: "Please sign in again." };
    return { ok: false, reason: "error", message: "The magazine couldn't be reached." };
  }

  if (response.status === 401 || json?.code === 401) {
    return { ok: false, reason: "signed_out", message: "Please sign in again." };
  }
  if (json?.success !== true) {
    // MODX words a refusal (wrong password, no permission) in message, and lists field errors in data
    // (e.g. a page with the same web address already exists).
    const message = json?.message || json?.data?.map?.((error) => error.msg).join(" ") || "";
    return message
      ? { ok: false, reason: "refused", message, fields: json?.data ?? [] }
      : { ok: false, reason: "error", message: `The magazine answered HTTP ${response.status}.` };
  }
  return { ok: true, json, setCookies: response.headers.getSetCookie() };
}
