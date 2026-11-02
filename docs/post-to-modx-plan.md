# Post to MODX: implementation plan (step 6)

Status: **draft, waiting for Ken's "approve"**. The staging test passed on 2026-11-02 on local copies of all 4 magazines (11 of 11 each, `docs/modx-staging-test.md`). Nothing here is built yet.

Research and verdicts: `docs/modx-integration-research.md`.

## For the agent picking this up

1. Read, in this order: `docs/post-to-modx-in-plain-words.md` (5 minutes), this plan, `docs/modx-staging-test.md` (the four sites' ids and the proven calls), `src/publish/modx-staging-test.js` (the reference for every connector call).
2. The staging test is done and approved (2026-11-02). Start with **job 2, the database**, on a branch from `origin/mvp`, following `.claude/rules/workflow.md`: plan the job in 1–2 lines, wait for Ken's "approve", then code.
3. The 3 open questions at the end are still open. Ask Ken the one your job depends on, one at a time: question 3 (shared accounts) before job 2, questions 1 and 2 before job 3.
4. Never run anything against a live magazine. The local copies (`docs/modx-staging-test.md`) are the only test targets.

## What changes in the MVP plan

`docs/mvp-plan.md` (2026-10-27) decided: "Posting: Supabase Edge Function calls a 'receive draft' endpoint on each site", with "each site needs one small receive-draft endpoint". The research shows that endpoint isn't needed: every MODX site already accepts the same calls its own manager makes (`connectors/index.php`), as the journalist's own account, and checks that account's permissions.

New decision to record, on approval:

| Area | Decision | Why |
| --- | --- | --- |
| Posting | A Supabase Edge Function posts straight to the magazine's MODX connector, signed in as the journalist's own MODX account. No change to any magazine. | No endpoint to write and maintain on 4 sites; MODX enforces who may post where; $0 (Edge Functions are on the free tier) |
| Magazine access | A journalist connects a magazine by entering their MODX username and password once. The function swaps them for a MODX session and keeps that, encrypted, in Supabase. The password is never stored. | Settles the open question "who may post to which magazine": whoever has a MODX account there. The admin-added `user_publications` row stays as the list of magazines offered |
| Statamic later | Same function, a second adapter. The app doesn't change. | As planned on 2026-10-27, only the adapter is swapped |

Everything else in the plan stays: drafts only, "Post draft to <magazine>" in the Share menu, the confirm step names the magazine.

## How it works

1. Settings → Channels: each magazine the admin gave the user shows **Connect**. The dialog asks for the MODX username and password for that magazine.
2. The Edge Function `magazine-connect` logs in to that magazine's `connectors/index.php` (`security/login`, context `mgr`, remember me). MODX returns a session cookie and a token. The function encrypts the pair and saves it with the user and the magazine; the password is discarded. The row shows **Connected as <MODX username>**, with **Disconnect**.
3. Share → **Post draft to <magazine>** → confirm. The Edge Function `post-draft` loads the connection, calls `resource/create` with `published = 0` in the magazine's article section and template, and returns the new resource id and its edit link in the MODX manager. The app shows "Draft posted · Open in <magazine>".
4. A 401 from MODX (session expired, password changed, account blocked) marks the connection **Needs sign-in**; the user reconnects from the same dialog. A permission refusal is shown as MODX words it.
5. **Disconnect** calls `security/logout` on the magazine and deletes the row.

What goes in the draft: the story's title as the page title; the content is the story's summary, the source link and a line "Found with Wirescout on <date>". The journalist writes the article in MODX, as now. (To confirm with Ken.)

## Database (one migration)

- `publications`: add `cms` (`modx`, later `statamic`), `cms_url` (e.g. `https://www.corporatedisclosures.org`), `article_parent_id`, `article_template_id`. Filled by hand per magazine (the site registry).
- `magazine_connections`: `user_id`, `publication_id`, `cms_username`, `session_ciphertext`, `status` (`connected`, `needs_sign_in`), `connected_at`, `last_used_at`. Unique per user and magazine.
    - Row-level security: users read their own rows **without** `session_ciphertext` (a view or column grant), and never insert or update them; only the functions, with the secret key, write them. Users may delete their own rows (disconnect) through the function so the MODX logout happens too.
- `publish_log`: `user_id`, `publication_id`, `article_id`, `action` (`connect`, `disconnect`, `post_draft`), `result`, `cms_resource_id`, `created_at`. Insert-only, read with the secret key. The usage report can count posts from it.
- pgTAP tests for the access rules, as for the other tables.

## Edge Functions (Deno, `supabase/functions/`)

- `magazine-connect`: actions `connect`, `disconnect`, `status`. Signed-in users only (Supabase JWT). Rate limit: 5 connect attempts per user per hour, so a wrong password can't trip the magazine's own login block (50 attempts).
- `post-draft`: `{ article_id, publication_id }`. Checks the user follows that article in one of their lists and holds a connection to that magazine, then creates the draft.
- Shared `modx.ts`: `login`, `logout`, `createDraft`, `getResource`, all taking a site record and a session. The token travels in the `modAuth` request header (PHP exposes it as `HTTP_MODAUTH`), the cookie in `Cookie`, and every call carries `X-Requested-With: XMLHttpRequest` so MODX returns real HTTP status codes. A refusal is HTTP 401 or a body with `code: 401`. All as in `src/publish/modx-staging-test.js`, which stays as the reference.
- Encryption: AES-256-GCM in the function, with the key in the function secret `MAGAZINE_SESSION_KEY` (32 bytes, base64). Ken sets it in the cloud; `.env.example` lists the name only.
- Secrets never reach the app or the logs: the functions return `status` and `cms_username` only.

## App (`src/app/`)

- Settings → Channels: Connect and Disconnect per magazine, the status, the connected username. Reuses the existing dialog and button components.
- Share menu: "Post draft to <magazine>" entries only for connected magazines; a not-yet-connected magazine shows "Connect <magazine> first" opening Settings. The confirm dialog, then a toast with the link.
- Story page: the same Share menu (already shared).
- `database.types.ts` regenerated.

## Production steps (Ken)

1. Set the function secret `MAGAZINE_SESSION_KEY` in the cloud project.
2. Deploy the 2 functions.
3. Push the migration, then fill the 4 `publications` rows (`cms_url`, `article_parent_id`, `article_template_id`), read from each site's database by its maintainer.
4. Confirm each magazine's `connectors/index.php` answers over HTTPS from outside (the research found no restriction in the corporate-disclosures nginx config; the other 3 sites need the same check).
5. One journalist with a MODX account tries Connect and Post draft on one magazine before the rest are announced.

## Jobs, in order (one branch each, from `origin/mvp`)

1. **Staging test** (this stage, no app code): run `docs/modx-staging-test.md` on the local corporate-disclosures copy. Go/no-go.
2. **Database**: the migration, access rules, tests, `database.types.ts`.
3. **Functions**: `modx.ts`, `magazine-connect`, `post-draft`, with unit tests against a small fake connector (Node's test runner, as the scanner does).
4. **App**: Channels settings and the Share menu entries.
5. **Release**: production steps above, then the trial with one journalist.

## Risks

- A magazine's host blocks or rate-limits requests to `/connectors` from Supabase's servers. Checked in production step 4 before any user sees the feature.
- The 4 sites differ only in ids: all are MODX 2.8 with an `article` template and a `News` section (ids in `docs/modx-staging-test.md`). A required template variable would show up as a `resource/create` error in the trial; none did on the local copies.
- A stored MODX session is as powerful as a logged-in manager tab. Mitigations in the research doc: encryption at rest, functions only, logout on disconnect, the audit log.
- The sites move to Statamic in months. The adapter boundary (`createDraft(site, session, story)`) keeps that to one new file.

## Open questions for Ken

1. Draft content: title + summary + source link + "Found with Wirescout" line, or title and link only?
2. Should the draft go into the magazine's main article section (`News` on Corporate Disclosures) or a dedicated "Wirescout drafts" section the editors create?
3. Is one connection per user per magazine enough, or do some journalists share a desk account? (Shared accounts would break the audit trail.)
