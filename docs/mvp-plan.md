# MVP plan

Agreed with Ken on 2026-10-27. Turns the prototype into an internal MVP for more journalists.

## Goals

- Each journalist signs in and manages their own watch lists.
- No HTML selectors asked from users: sources are added by URL only.
- One daily digest email instead of an alert every few hours.
- Post a story from a watch list to the journalist's magazine as a draft.
- $0 running cost.

## Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Frontend | Static web app on GitHub Pages | Free, already on GitHub |
| Backend | Supabase free tier: login, Postgres, row-level security, Edge Functions | Free; no server of our own to run |
| Architecture | Decoupled but small: static app + Supabase + scanner | Each part is free to host; no API layer to maintain |
| Scanner | GitHub Actions on a schedule, state in Supabase | Free (public repo); stops committing `state.json` to `main` |
| Email | Current SMTP setup | Already works |
| Posting | Supabase Edge Function calls a "receive draft" endpoint on each site | CMS credentials stay server-side |

## Scanning without selectors

For each source URL, in order:

1. **RSS/Atom feed:** auto-discover it from the page. Stable when the site's design changes.
2. **Automatic list detection:** Cheerio finds the repeated blocks of article links.
3. **Optional AI fallback:** only for sources the first two can't read. Pennies per month.

**Health check:** when a source suddenly returns 0 articles, or far fewer than usual, a dev gets an email.

## Data model (outline)

- **Users:** sign in through Supabase Auth.
- **Publications:** Environmental Finance, InsuranceERM, Insurance Asset Risk, Corporate Disclosures.
- **User ↔ publication:** which magazines each user may post to. Most users have one; some have several.
- **Watch lists:** owned by one user and linked to **one** publication.
    - Users with a single publication never pick one: it is set for them.
- **Sources:** URLs in a watch list.
- **Articles:** found by the scanner, plus a seen/unseen flag per user.

## Features

### Daily digest

- The scanner runs every few hours and only saves new articles. It sends no email.
- Every morning at one fixed time (7am UK), each user gets **one** email: a section per watch list, the new-item counts, and a link to the dashboard.
- This replaces the earlier idea of a separate email per list.

### Dashboard

- One box per watch list, showing its number of new items.
- Clicking a box opens that watch list.

### Post from Wirescout

- The Post button sends the story to the watch list's publication, never to another one.
- The confirm step names the magazine ("Post draft to Insurance Asset Risk?").
- Stories go in as **drafts** so an editor still reviews them.
- All 4 magazines run on MODX today, and MODX has no ready-made API for creating articles. Each site needs one small "receive draft" endpoint.
- All 4 are moving to Statamic (months away). Its API is read-only, so it will need the same endpoint. Wirescout doesn't change: only the endpoint on each site is swapped.

## Branches

- Every MVP job: a branch from `mvp`, with a PR into `mvp`.
- `main` stays live and untouched until the MVP is ready; then `mvp` is merged into `main` once.
- `main` keeps getting "Update state" commits from the live scanner. Merge `main` into `mvp` before the release merge.

## Build order

1. Docs and Claude setup
2. Supabase: database, login, publications per user
3. Watch lists UI and dashboard
4. New scanner (feeds, auto-detection, health check)
5. Daily digest email
6. Post from Wirescout (last: it touches the live magazine sites)

## Known risks

- Supabase pauses free projects after a week with no activity. The scanner's runs keep it active.
- Some sources render articles with JavaScript or block bots. Feeds and the AI fallback cover part of this; see `docs/known-issues.md`.
- The repo is public: user data must live only in Supabase, never in the repo.
