# Post to MODX: implementation plan (step 6)

Status: **approved 2026-11-02; jobs 2 (database), 3 (functions) and 4 (app) built**. Next: job 5, the release. The staging test passed on 2026-11-02 on local copies of all 4 magazines (11 of 11 each, `docs/modx-staging-test.md`). Nothing here is built yet.

Research and verdicts: `docs/modx-integration-research.md`.

## For the agent picking this up

1. Read, in this order: `docs/post-to-modx-in-plain-words.md` (5 minutes), this plan, `docs/modx-staging-test.md` (the four sites' ids and the proven calls), `src/publish/modx-staging-test.js` (the reference for every connector call).
2. The staging test is done and approved (2026-11-02). Start with **job 2, the database**, on a branch from `origin/mvp`, following `.claude/rules/workflow.md`: plan the job in 1–2 lines, wait for Ken's "approve", then code.
3. All 3 open questions at the end are decided (2026-11-02). Nothing to ask before job 2.
4. Never run anything against a live magazine. The local copies (`docs/modx-staging-test.md`) are the only test targets.

## What changes in the MVP plan

`docs/mvp-plan.md` (2026-10-27) decided: "Posting: Supabase Edge Function calls a 'receive draft' endpoint on each site", with "each site needs one small receive-draft endpoint". The research shows that endpoint isn't needed: every MODX site already accepts the same calls its own manager makes (`connectors/index.php`), as the journalist's own account, and checks that account's permissions.

New decision to record, on approval:

| Area | Decision | Why |
| --- | --- | --- |
| Posting | A Supabase Edge Function posts straight to the magazine's MODX connector, signed in as the journalist's own MODX account. No change to any magazine. | No endpoint to write and maintain on 4 sites; MODX enforces who may post where; $0 (Edge Functions are on the free tier) |
| Magazine access | A journalist connects a magazine by entering their MODX username and password once. The function swaps them for a MODX session and keeps that, encrypted, in Supabase. The password is never stored. All 4 magazines are offered to everyone; the magazine's own login decides who gets in. | Settles the open question "who may post to which magazine": whoever has a MODX account there. No admin step: `user_publications` is no longer needed for sending (Ken, 2026-11-02) |
| Draft text | Title and a 100–250 character news brief (1 or 2 paragraphs) suggested by Claude Haiku 5.5 from the story's page, editable by the journalist before sending. The last line is the source link. No mention of Wirescout. | Saves the journalist the first draft; a person still approves every word; the model only sees the real article, so it can't invent facts from a two-line summary (Ken, 2026-11-02) |
| Statamic later | Same function, a second adapter. The app doesn't change. | As planned on 2026-10-27, only the adapter is swapped |

Everything else in the plan stays: drafts only, "Post draft to <magazine>" in the Share menu, the confirm step names the magazine.

## How it works

1. Settings → Channels: each magazine the admin gave the user shows **Connect**. The dialog asks for the MODX username and password for that magazine.
2. The Edge Function `magazine-connect` logs in to that magazine's `connectors/index.php` (`security/login`, context `mgr`, remember me). MODX returns a session cookie and a token. The function encrypts the pair and saves it with the user and the magazine; the password is discarded. The row shows **Connected as <MODX username>**, with **Disconnect**.
3. Share → **Send to <magazine>** opens the Send dialog (below), pre-filled by the Edge Function `draft-text`. **Send** calls the Edge Function `post-draft`, which loads the connection, calls `resource/create` with `published = 0` in the magazine's article section and template, and returns the new resource id and its edit link in the MODX manager. The app shows "Draft sent · Open in <magazine>".
4. A 401 from MODX (session expired, password changed, account blocked) marks the connection **Needs sign-in**; the user reconnects from the same dialog. A permission refusal is shown as MODX words it.
5. **Disconnect** calls `security/logout` on the magazine and deletes the row.

## The Send dialog (Ken, 2026-11-02)

Heading **Send draft to {Magazine}**, then the line **You're sending this as {MODX username}**, then two editable fields and a **Send** button:

- **Title:** suggested by Claude Haiku 5.5; falls back to the story's original title.
- **Content:** a news brief of 100–250 characters (1 or 2 paragraphs, cut to fit if the model writes more) suggested by Claude Haiku 5.5 from the story's page; falls back to the story's original summary when the page can't be fetched. The last line is always `Source: <full story link>` (the link as text and as a link). No summary field.
- The journalist edits both fields freely. What is sent is what they see.
- The draft never mentions Wirescout or AI. The publish log records `ai_assisted` for us only.

The suggestion is made by the Edge Function `draft-text` when the dialog opens (a spinner for a few seconds): it fetches the story page with the scanner's reader (`src/scanner/check-link.js`, as `check-links` does), and asks the model for a title and a brief using only what is on the page. Model `claude-haiku-5-5`, `max_tokens` about 1,000, the API key in the function secret `ANTHROPIC_API_KEY`, never in the browser. Cost: under a cent per draft at $0.10 per million input tokens and $0.50 per million output. If the model or the fetch fails, the dialog opens with the fallbacks and no error: the journalist can still send.

**No magazine connected yet:** the same dialog shows **You haven't set up a magazine yet**, a dropdown with the 4 magazines, then (once one is picked) MODX username and password fields and an **Add magazine** button. On success it continues straight to the Send form. Under the form, in small text:

> Your password is used once to sign in and is never stored. {Magazine} gives Wirescout a sign-in session, kept encrypted on our server. You can remove it any time in Settings → Channels.

The same Add magazine form is used from Settings → Channels. No browser cookie is involved: the connection belongs to the Wirescout account, so it works on any device.

## Database (one migration)

- `publications`: add `cms` (`modx`, later `statamic`), `cms_url` (e.g. `https://www.corporatedisclosures.org`), `article_parent_id`, `article_template_id`. Filled by hand per magazine (the site registry).
- `magazine_connections`: `user_id`, `publication_id`, `cms_username`, `session_ciphertext`, `status` (`connected`, `needs_sign_in`), `connected_at`, `last_used_at`. Unique per user and magazine, and unique per magazine and `cms_username` (own accounts only, decided 2026-11-02).
    - Row-level security: users read their own rows **without** `session_ciphertext` (a view or column grant), and never insert or update them; only the functions, with the secret key, write them. Users may delete their own rows (disconnect) through the function so the MODX logout happens too.
- `publish_log`: `user_id`, `publication_id`, `article_id`, `action` (`connect`, `disconnect`, `post_draft`), `result`, `cms_resource_id`, `ai_assisted`, `created_at`. Insert-only, read with the secret key. The usage report can count posts from it.
- `publications` is offered whole to every user; `user_publications` stays in the schema for now but no longer gates sending (decided 2026-11-02).
- pgTAP tests for the access rules, as for the other tables.

## Edge Functions (Deno, `supabase/functions/`)

- `magazine-connect`: actions `connect`, `disconnect` (no `status`: the app reads the user's own rows in `magazine_connections`). Signed-in users only (Supabase JWT). Rate limit: 3 failed connect attempts per user per magazine, then a 15-minute wait (Ken, 2026-11-02). That is far below any magazine's own lockout (InsuranceERM blocks after 20 wrong passwords, the others after 50), so Wirescout can never lock a journalist out of their magazine. The password is never logged.
- `draft-text`: `{ article_id, publication_id }`. Fetches the story page and returns `{ title, content, suggested }` from Claude Haiku 5.5, or the fallbacks. Signed-in users only. 10 calls per user per hour, counted in `publish_log` (action `draft_text`, Ken 2026-11-02); after that, the fallbacks.
- `post-draft`: `{ article_id, publication_id, title, content, ai_assisted }` (what the journalist sees in the dialog). Checks the user follows that article in one of their lists and holds a connection to that magazine, then creates the draft. An expired session (HTTP 401) answers `needs_sign_in`; a refusal is shown as MODX words it.
- Shared `src/publish/modx.js` (plain JS, like `check-links` shares the scanner's code, so Node's test runner covers it): `login`, `logout`, `createDraft`, `getResource`, all taking a site record and a session. The token travels in the `modAuth` request header (PHP exposes it as `HTTP_MODAUTH`), the cookie in `Cookie`, and every call carries `X-Requested-With: XMLHttpRequest` so MODX returns real HTTP status codes. A refusal is HTTP 401 or a body with `code: 401`. All as in `src/publish/modx-staging-test.js`, which stays as the reference.
- Encryption: AES-256-GCM in the function, with the key in the function secret `MAGAZINE_SESSION_KEY` (32 bytes, base64). Ken sets it in the cloud; `.env.example` lists the name only.
- `ANTHROPIC_API_KEY`: function secret for `draft-text`. Same handling.
- Secrets never reach the app or the logs: the functions return `status` and `cms_username` only.

## App (`src/app/`)

As built (job 4, with Ken's changes of 2026-11-02):

- Share menu: one "Send to <magazine>" per magazine the user added, then "Add a magazine" (opens Channels), then Copy link, Email, LinkedIn.
- Send dialog: the info note ("You're sending this as …"), the editable title and text, Cancel and Send. After sending, the confirmation and "Open in <magazine>" replace the fields; Send stays greyed out.
- Duplicates: the dialog warns when anyone already sent the story to that magazine (`story_sends`, by story, not title), with "Open existing story" and "Send anyway". If MODX refuses a same-title article, the error says it may have been sent before, with "Open existing story", and Send waits for a new title. The story card shows "Sent to <magazine>".

As planned:

- Settings → Channels: all 4 magazines, each Connected as <username> with Disconnect, or an Add magazine button opening the shared form. Reuses the existing dialog and button components.
- Share menu: one "Send to <magazine>" entry per magazine. Connected: the Send dialog. Not connected: the same dialog in its Add magazine state, then the Send form. After Send, a toast with the link.
- Story page: the same Share menu (already shared).
- `database.types.ts` regenerated.

## Production steps (Ken)

1. Set the function secrets `MAGAZINE_SESSION_KEY` and `ANTHROPIC_API_KEY` in the cloud project.
2. Deploy the 3 functions.
3. Push the migration, then fill the 4 `publications` rows (`cms_url`, `article_parent_id`, `article_template_id`), read from each site's database by its maintainer.
4. Confirm each magazine's `connectors/index.php` answers over HTTPS from outside (the research found no restriction in the corporate-disclosures nginx config; the other 3 sites need the same check).
    - **Result 2026-11-02:** Corporate Disclosures answers. The other 3 are behind a Cloudflare bot check (403 "Just a moment...") and show as "Coming soon..." (`publications.coming_soon`) until Cloudflare lets `/connectors/` through for Wirescout, ideally only for requests carrying a secret header the functions send (Supabase has no fixed address to allow).
5. One journalist with a MODX account tries Connect and Post draft on one magazine before the rest are announced.

## Jobs, in order (one branch each, from `origin/mvp`)

1. **Staging test** (this stage, no app code): run `docs/modx-staging-test.md` on the local corporate-disclosures copy. Go/no-go.
2. **Database**: the migration, access rules, tests, `database.types.ts`.
3. **Functions**: `modx.ts`, `magazine-connect`, `post-draft`, `draft-text`, with unit tests against a small fake connector and a fake model response (Node's test runner, as the scanner does).
4. **App**: Channels settings and the Share menu entries.
5. **Release**: production steps above, then the trial with one journalist.

## Risks

- A magazine's host blocks or rate-limits requests to `/connectors` from Supabase's servers. Checked in production step 4 before any user sees the feature.
- The 4 sites differ only in ids: all are MODX 2.8 with an `article` template and a `News` section (ids in `docs/modx-staging-test.md`). A required template variable would show up as a `resource/create` error in the trial; none did on the local copies.
- A stored MODX session is as powerful as a logged-in manager tab. Mitigations in the research doc: encryption at rest, functions only, logout on disconnect, the audit log.
- The sites move to Statamic in months. The adapter boundary (`createDraft(site, session, story)`) keeps that to one new file.

## Open questions for Ken (all decided 2026-11-02)

1. ~~Draft content~~ Decided 2026-11-02: see "The Send dialog".
2. ~~Section~~ Decided 2026-11-02: drafts go to each magazine's **In Brief** section, except Corporate Disclosures, which has none, where they go to **News**. The `article_parent_id` per site (ids read from the local database copies; confirm on each live site before use):

    | Magazine | Draft section | `article_parent_id` | `article_template_id` |
    | --- | --- | --- | --- |
    | Environmental Finance | In Brief | 77814 | 3 (article) |
    | InsuranceERM | In Brief | 65468 | 8 (article) |
    | Insurance Asset Risk | In Brief | 31708 | 4 (article) |
    | Corporate Disclosures | News | 19 | 3 (article) |
3. ~~Shared accounts~~ Decided 2026-11-02: everyone has their own MODX login. One connection per Wirescout user per magazine (unique together), and the same MODX username may not be connected by two Wirescout users on the same magazine. Every draft is traceable to a person on both sides.

## Notes for later (not this job)

- The Wirescout sign-in screen has no "Stay signed in" option (Ken, 2026-11-02). Logged in `docs/known-issues.md`.
