# Project facts

## What Wirescout is

An internal Field Gibson Media tool for journalists. It watches a curated list of news sources and alerts them about new stories, like Google Alerts limited to the sources they choose.

## Stack (current prototype)

- Node.js 20 (ES modules), no framework.
- `cheerio` parses each source's HTML with hand-written CSS selectors.
- `chrono-node` parses article dates.
- `nodemailer` sends alerts over SMTP (`EMAIL_*` variables).
- GitHub Actions runs the scanner every 4 hours (`.github/workflows/scraper.yml`).
- Git: GitHub (`kennethzuniga/wirescout`), public. `main` is live; MVP work goes into `mvp` until release.

The MVP stack is decided in `docs/mvp-plan.md`. Built so far:

- Supabase (Postgres 17 + Auth), developed locally with the Supabase CLI (`npx supabase`, a dev dependency) in Docker.
- Web app: Vue 3 + TypeScript, Vite, Tailwind + DaisyUI, Reka UI, Vue Router, `@supabase/supabase-js`, `read-excel-file` (bulk source upload). It talks to Supabase directly; access is protected by row-level security.

## Layout

All code lives in `src/`: the web app in `src/app/`, and the scanner (moving into `src/scanner/` in build step 4).

- `index.html`, `vite.config.ts`, `tsconfig.json`: the web app's entry page and build settings.
- `src/app/`: the web app. `pages/` (one file per screen), `components/` (`ui/` holds the shared building blocks, copied from hub), `layouts/`, `lib/supabase.ts` (the connection), `router.ts`.
- `src/app/lib/database.types.ts`: generated from the local database with `npm run types`. Regenerate after a schema change.
- `.env.development`: the web app's connection to the local Supabase (public demo values, safe to commit).
- `src/index.js`: fetch each source, extract articles, compare with the last scan, email the new ones.
- `src/sites.js`: the hardcoded source list, with CSS selectors per source.
- `src/state.json`: the last scan. The workflow commits it to `main` after every run.
- `src/utils/state.js`: load, save and compare `state.json`.
- `src/utils/email.js`: builds and sends the alert email.
- `reset.js`: empties `state.json`.
- `supabase/config.toml`: local Supabase settings (sign-ups on for allowed emails, the sign-up check, email templates).
- `supabase/templates/`: the account emails (confirm account, new password, email change). The cloud project needs the same templates pasted into its dashboard.
- `supabase/migrations/`: the database schema and access rules, one SQL file per change.
- `supabase/tests/database/`: access tests (pgTAP).
- `supabase/seed.sql`: made-up sources and articles, loaded into the local database on every reset.

## How a run works

1. Fetch every source in `src/sites.js`.
2. Extract articles with that source's selectors.
3. An article is new when its link is not in `state.json`.
4. If there are new articles, email them to `EMAIL_RECIPIENTS`.
5. Save the current scan to `state.json`; the workflow commits it.

## Install

```bash
npm ci
```

## Run (dev environment)

- Copy `.env.example` to `.env` and point `EMAIL_*` at a test inbox, never at real journalists.
- `npm start`

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
- Local URLs and demo keys: `npx supabase status`. Local emails (invites, sign-in links) go to Mailpit at http://127.0.0.1:54324.
- New schema change: `npx supabase migration new <name>`, then `npx supabase db reset` to rebuild the local database.

## Before a PR

```bash
npx supabase test db
npx supabase db lint
npm run type-check
npm run build
```

- Run `npx supabase db reset` first: the tests expect an empty user table.
- Web app changes: click through the changed screens with `npm run dev`.
- Scanner changes: check that `npm start` runs without errors against a test inbox.
