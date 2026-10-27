# Project facts

## What Wirescout is

An internal Field Gibson Media tool for journalists. It watches a curated list of news sources and alerts them about new stories, like Google Alerts limited to the sources they choose.

## Stack (current prototype)

- Node.js 20 (ES modules), no framework.
- `cheerio` parses each source's HTML with hand-written CSS selectors.
- `chrono-node` parses article dates.
- `nodemailer` sends alerts over SMTP (`EMAIL_*` variables).
- GitHub Actions runs the scanner every 4 hours (`.github/workflows/scraper.yml`).
- Git: GitHub (`kennethzuniga/wirescout`), public. `main` is live.

The MVP stack is decided in `docs/mvp-plan.md`.

## Layout

- `src/index.js`: fetch each source, extract articles, compare with the last scan, email the new ones.
- `src/sites.js`: the hardcoded source list, with CSS selectors per source.
- `src/state.json`: the last scan. The workflow commits it to `main` after every run.
- `src/utils/state.js`: load, save and compare `state.json`.
- `src/utils/email.js`: builds and sends the alert email.
- `reset.js`: empties `state.json`.

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

## Before a PR

- No automated tests or linters yet. Check that `npm start` runs without errors against a test inbox.
