# Project facts

## What Wirescout is

An internal Field Gibson Media tool for journalists, in production since 2026-11-03. It watches a curated list of news sources and alerts them about new stories, like Google Alerts limited to the sources they choose.

## Stack

- Scanner: Node.js 22 (ES modules), no framework.
    - `cheerio` reads feeds and pages, `chrono-node` reads dates written on pages.
    - `@supabase/supabase-js` saves stories and source status with the secret key (`SUPABASE_*` variables). In the cloud it's the key named `wirescout_scanner` (Project Settings → API Keys), saved in the GitHub secret `SUPABASE_SECRET_KEY`.
    - `nodemailer` sends the health email to a developer over SMTP (`EMAIL_*`, `ADMIN_EMAIL`).
    - GitHub Actions runs it every hour (`.github/workflows/scanner.yml`), installing only the runtime packages (`npm ci --omit=dev`).
- Daily digest: Node.js 22, same packages as the scanner. GitHub Actions runs it every 15 minutes (`.github/workflows/digest.yml`).
- Admin emails: the same again, every hour (`.github/workflows/admin.yml`).
- Git: GitHub (`fieldgibsonmedia/wirescout`), public. `main` is live; MVP work goes into `mvp`, and each finished stage is merged into `main`.

The MVP stack is decided in `docs/mvp-plan.md`. Built so far:

- Supabase (Postgres 17 + Auth), developed locally with the Supabase CLI (`npx supabase`, a dev dependency) in Docker. The cloud project sends account emails through Brevo (SMTP, as `no-reply@wirescout.app`), set in its dashboard. The digest, admin and scanner emails go through Brevo too (the `EMAIL_*` secrets), sending as `no-reply@wirescout.app` (`EMAIL_FROM`, a plain value in their workflows).
- Web app: Vue 3 + TypeScript, Vite, Tailwind + DaisyUI, Reka UI, Vue Router, `@supabase/supabase-js`, `read-excel-file` (bulk source upload). It talks to Supabase directly; access is protected by row-level security. Published on GitHub Pages at `wirescout.app` (custom domain, DNS at Namecheap).

## Layout

All code lives in `src/`: the web app in `src/app/`, the scanner in `src/scanner/`, the daily digest in `src/digest/`, the admin emails in `src/admin/`.

- `index.html`, `vite.config.ts`, `tsconfig.json`: the web app's entry page and build settings.
- `src/app/`: the web app. `pages/` (one file per screen), `components/` (`ui/` holds the shared building blocks, copied from hub), `layouts/`, `lib/supabase.ts` (the connection), `router.ts`.
- `src/app/lib/database.types.ts`: generated from the local database with `npm run types`. Regenerate after a schema change.
- `.env.development`: the web app's connection to the local Supabase (public demo values, safe to commit).
- `.env.production`: the live app's connection to the cloud Supabase project (public URL and publishable key, safe to commit).
- `.github/workflows/deploy-app.yml`: builds the web app and publishes it to GitHub Pages on every push to `main`.
- `.github/workflows/scanner.yml`: runs the scanner every hour, at :17.
- `.github/workflows/digest.yml`: sends the due daily digests every 15 minutes (:05, :20, :35, :50).
- `.github/workflows/admin.yml`: emails `ADMIN_EMAIL` new access requests and the monthly usage report, every hour at :40.
- `src/admin/index.js`: the admin emails (below). `emails.js` writes them, `months.js` picks the months. Tests next to them.
- `src/app/lib/usage.ts`: records usage for the report (days, shares, digest clicks).
- `src/app/lib/magazines.ts`: the magazines, the user's connections and who already sent which story (`story_sends`), for Settings → Channels, the Share menu and the Send dialog (`components/SendDraftDialog.vue`).
- `src/app/lib/releaseNotes.ts`: the dashboard's "What's new". Add notes with each release. Its newest entry and the side nav take the version from `package.json`. Every job that changes what users get raises the version (`docs/mvp-plan.md`, Decisions).
- `src/digest/index.js`: the digest (below). `due.js` decides who gets one, `email.js` writes it. Tests next to them.
- `src/scanner/index.js`: the scan (below). `check-source.js` checks one source and saves its stories and status, `read-source.js` picks feed or page, `feed.js` and `page.js` read them, `health.js` decides whether the scanner looks broken and writes the health email. Tests next to them (`*.test.js`).
- `supabase/config.toml`: local Supabase settings (sign-ups on for allowed emails, the sign-up check, email templates).
- `supabase/templates/`: the account emails (confirm account, new password, email change). The cloud project needs the same templates pasted into its dashboard.
- `supabase/migrations/`: the database schema and access rules, one SQL file per change.
- `supabase/functions/check-links/`: an Edge Function that checks links before they're added, with the scanner's own code (`src/scanner/check-link.js`). The app sends one link per call (the free plan's 2 seconds of processing per call); signed-in users only.
- `supabase/functions/scan-new-sources/`: reads a source just added, once, and saves its stories and status with the scanner's own code (`src/scanner/check-source.js`), so a new list shows stories right away. One source per call, only the user's own sources that were never checked.
- `supabase/functions/magazine-connect/`, `post-draft/`, `draft-text/`: posting drafts to the magazines' MODX (`docs/post-to-modx-plan.md`), with `_shared/magazines.ts`. Their code lives in `src/publish/`: `modx.js` (the MODX connector), `session-crypto.js` (locks the stored sessions), `draft.js` (the suggested draft text). Tests next to them. `modx-staging-test.js` is the proven reference for the connector calls.
- `supabase/tests/database/`: access tests (pgTAP).
- `supabase/seed.sql`: made-up sources and articles, loaded into the local database on every reset.

## How a scan works

1. Take every source that at least one watch list follows.
2. Read its stories (the newest 50), first match wins:
    1. The feed found last time.
    2. The address itself, if it's a feed.
    3. A feed the page names in its `<head>`.
    4. The page itself: the biggest list of similar links that read like headlines.
    5. A guessed feed (`feed`, `rss` next to the page, then `/feed`, `/rss`).
3. Save the stories whose link is new for that source. Stories are never deleted.
4. Record the source's status: last checked, stories found, feed or page.
5. If the scanner itself looks broken (at least half of the sources that found stories last time find none, and at least 3), email `ADMIN_EMAIL`. Once per break, not every hour. One failing source emails nobody: the journalist sees it in the digest and the Sources tab.

The logs show only totals: the repo is public, and which sources people follow is theirs.

## How the daily digest works

1. Take every user whose digest is due: Monday to Friday in their time zone, their time has passed, and none yet today. A skipped run is caught up later the same day.
2. For each watch list: the stories found since their last digest (at most 7 days back), through the keywords (`watch_list_articles`), and the failing sources.
3. Email up to 5 stories per list, each linking to its page in the app (`/lists/<list>/stories/<story>`), never to the source site. Failing sources link to the list's Sources tab.
4. No new stories in any list: no email. Either way, `profiles.last_digest_at` records that today's digest is done.

## Usage and admin emails

- The app records, per person: each day they open it (`active_days`), each Share click and each digest link they open (`usage_events`). Users can only add their own rows; only the secret key reads them.
- Every hour, `admin.yml` emails `ADMIN_EMAIL`:
    - new access requests, once each (`access_requests.notified_at`);
    - once a month is over, the usage report: active days per person for the last 6 months, last month's shares and digest clicks, and the 5 most shared stories. Each month once (`usage_reports`).

## Install

```bash
npm ci
```

## Run the scanner (dev environment)

- Start the local Supabase (below) and follow some sources in a local watch list.
- Copy `.env.example` to `.env`, with the local secret key from `npx supabase status`.
- Point `EMAIL_*` at Mailpit (host `127.0.0.1`, port `54325`, no user or password) and `ADMIN_EMAIL` at a made-up address.
- `npm run scan`, then see the stories in the app and any health email in Mailpit.
- `npm test`: the scanner's, the digest's and the admin emails' tests.

## Run the daily digest (dev environment)

- Same `.env` as the scanner, plus `APP_URL=http://127.0.0.1:3000`, with `EMAIL_*` pointing at Mailpit.
- `npm run digest`: emails every local user whose digest is due. See them in Mailpit.
- To send one again today, clear `last_digest_at` on the user's profile in Studio.

## Run the admin emails (dev environment)

- Same `.env` as the scanner, with `ADMIN_EMAIL` at a made-up address and `EMAIL_*` pointing at Mailpit.
- `npm run admin`: sends new access requests, and last month's usage report if it hasn't gone yet. See them in Mailpit.
- To send a report again, delete its month from `usage_reports` in Studio.

## Run the web app (dev environment)

1. Start the local Supabase (below).
2. `npm run dev`, then open http://127.0.0.1:3000.
3. To get a local test user:
    - Create an account on the sign-up page with a made-up address at an allowed domain (e.g. `test@fieldgibsonmedia.com`).
    - Open the email in Mailpit and click Confirm.
    - Optional, to send a draft: start the magazine's local copy (`docs/modx-staging-test.md`) and the functions (below), then Settings → Channels → Add magazine with its `wirescout-test` account.
4. Add `https://news.example.com/press` or `https://regulator.example.org/updates` to a watch list to see the seed articles.

## Admin tasks (in Studio, or the cloud dashboard)

- **Let someone sign up:** Table Editor → `allowed_email_domains` → Insert row, with a domain (`example.com`) or one full address. Lower case.
- **Access requests:** Table Editor → `access_requests`. Add the address to the allowed list, reply by email, then set `handled_at` to now.
- **A magazine for a user:** nothing to do. Every magazine is offered to everyone; the journalist adds it with their own MODX account (Settings → Channels).
- **A leaver:** their account stays until you delete it: Authentication → Users → the user → Delete. Their watch lists go with it.

## Local Supabase

- Docker Desktop must be running.
- Start: `npx supabase start`. Stop: `npx supabase stop`.
- Local URLs and demo keys: `npx supabase status`. Local emails (account and password emails) go to Mailpit at http://127.0.0.1:54324.
- New schema change: `npx supabase migration new <name>`, then `npx supabase db reset` to rebuild the local database.
- Edge Functions run with the local Supabase. If it was started before a function existed, run `npx supabase functions serve --env-file supabase/functions/.env`.
    - The posting functions need `MAGAZINE_SESSION_KEY` in `supabase/functions/.env` (never committed; any `openssl rand -base64 32`). `ANTHROPIC_API_KEY` is optional: without it the Send dialog uses the story's own text.
    - They reach the local magazine copies on their own ports (`http://host.docker.internal:8081` to `8084`, set in the seed): inside Docker the `.test` names point at the container itself. The magazine's web container must be running.

## Before a PR

```bash
npx supabase test db
npx supabase db lint
npm test
npm run type-check
npm run build
```

- Run `npx supabase db reset` first: the tests expect an empty user table.
- Web app changes: click through the changed screens with `npm run dev`.
- Scanner changes: run `npm run scan` against the local Supabase, with email going to Mailpit.
