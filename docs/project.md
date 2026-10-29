# Project facts

## What Wirescout is

An internal Field Gibson Media tool for journalists. It watches a curated list of news sources and alerts them about new stories, like Google Alerts limited to the sources they choose.

## Stack

- Scanner: Node.js 22 (ES modules), no framework.
    - `cheerio` reads feeds and pages, `chrono-node` reads dates written on pages.
    - `@supabase/supabase-js` saves stories and source status with the secret key (`SUPABASE_*` variables).
    - `nodemailer` sends the health email to a developer over SMTP (`EMAIL_*`, `ADMIN_EMAIL`).
    - GitHub Actions runs it every hour (`.github/workflows/scanner.yml`), installing only the runtime packages (`npm ci --omit=dev`).
- Git: GitHub (`fieldgibsonmedia/wirescout`), public. `main` is live; MVP work goes into `mvp`, and each finished stage is merged into `main`.

The MVP stack is decided in `docs/mvp-plan.md`. Built so far:

- Supabase (Postgres 17 + Auth), developed locally with the Supabase CLI (`npx supabase`, a dev dependency) in Docker. The cloud project sends account emails through a Gmail account (SMTP, app password), set in its dashboard.
- Web app: Vue 3 + TypeScript, Vite, Tailwind + DaisyUI, Reka UI, Vue Router, `@supabase/supabase-js`, `read-excel-file` (bulk source upload). It talks to Supabase directly; access is protected by row-level security. Published on GitHub Pages at `fieldgibsonmedia.github.io/wirescout/`.

## Layout

All code lives in `src/`: the web app in `src/app/`, the scanner in `src/scanner/`.

- `index.html`, `vite.config.ts`, `tsconfig.json`: the web app's entry page and build settings.
- `src/app/`: the web app. `pages/` (one file per screen), `components/` (`ui/` holds the shared building blocks, copied from hub), `layouts/`, `lib/supabase.ts` (the connection), `router.ts`.
- `src/app/lib/database.types.ts`: generated from the local database with `npm run types`. Regenerate after a schema change.
- `.env.development`: the web app's connection to the local Supabase (public demo values, safe to commit).
- `.env.production`: the live app's connection to the cloud Supabase project (public URL and publishable key, safe to commit).
- `.github/workflows/deploy-app.yml`: builds the web app and publishes it to GitHub Pages on every push to `main`.
- `.github/workflows/scanner.yml`: runs the scanner every hour, at :17.
- `src/scanner/index.js`: the scan (below). `read-source.js` picks feed or page, `feed.js` and `page.js` read them, `health.js` writes the health email. Tests next to them (`*.test.js`).
- `supabase/config.toml`: local Supabase settings (sign-ups on for allowed emails, the sign-up check, email templates).
- `supabase/templates/`: the account emails (confirm account, new password, email change). The cloud project needs the same templates pasted into its dashboard.
- `supabase/migrations/`: the database schema and access rules, one SQL file per change.
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
5. If a source just broke (0 stories, under half of last time, or unreadable on its first check), email `ADMIN_EMAIL`. Once per break, not every hour.

The logs show only totals: the repo is public, and which sources people follow is theirs.

## Install

```bash
npm ci
```

## Run the scanner (dev environment)

- Start the local Supabase (below) and follow some sources in a local watch list.
- Copy `.env.example` to `.env`, with the local secret key from `npx supabase status`.
- Point `EMAIL_*` at Mailpit (host `127.0.0.1`, port `54325`, no user or password) and `ADMIN_EMAIL` at a made-up address.
- `npm run scan`, then see the stories in the app and any health email in Mailpit.
- `npm test`: the scanner's tests (feeds, pages, health check).

## Run the web app (dev environment)

1. Start the local Supabase (below).
2. `npm run dev`, then open http://127.0.0.1:3000.
3. To get a local test user:
    - Create an account on the sign-up page with a made-up address at an allowed domain (e.g. `test@fieldgibsonmedia.com`).
    - Open the email in Mailpit and click Confirm.
    - Optional, to see a magazine under Settings → Channels: Table Editor → `user_publications` → Insert row, with the user and a `publication_id` (1 Environmental Finance, 2 InsuranceERM, 3 Insurance Asset Risk, 4 Corporate Disclosures).
4. Add `https://news.example.com/press` or `https://regulator.example.org/updates` to a watch list to see the seed articles.

## Admin tasks (in Studio, or the cloud dashboard)

- **Let someone sign up:** Table Editor → `allowed_email_domains` → Insert row, with a domain (`example.com`) or one full address. Lower case.
- **Access requests:** Table Editor → `access_requests`. Add the address to the allowed list, reply by email, then set `handled_at` to now.
- **A magazine for a user:** Table Editor → `user_publications` → Insert row.
- **A leaver:** their account stays until you delete it: Authentication → Users → the user → Delete. Their watch lists go with it.

## Local Supabase

- Docker Desktop must be running.
- Start: `npx supabase start`. Stop: `npx supabase stop`.
- Local URLs and demo keys: `npx supabase status`. Local emails (account and password emails) go to Mailpit at http://127.0.0.1:54324.
- New schema change: `npx supabase migration new <name>`, then `npx supabase db reset` to rebuild the local database.

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
