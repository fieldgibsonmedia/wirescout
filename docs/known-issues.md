# Known issues

Bugs found while working on something else. One entry each: date, what, where, how to see it.

## 2026-10-27: An access test fails when the local database has users

- `supabase/tests/database/access.test.sql`, "A profile is created for each new user", counts every profile and expects 2.
- Invite a local test user, then run `npx supabase test db`: it fails with "have: 4, want: 2". Passes after `npx supabase db reset`.

## 2026-10-27: The scanner workflow uses Node 20, which is past its end of life

- `.github/workflows/scraper.yml` sets `node-version: "20"`. Node 20 stopped getting security fixes in April 2026.

## 2026-10-27: `npm audit` reports high-severity issues in `nodemailer` and `undici`

- `nodemailer` 6.10.1 (direct dependency) and `undici` 7.18.2 (through `cheerio`). Already on `main`, not added by the Supabase work.
- See them with `npm audit`. Fixing `nodemailer` needs a major upgrade.

## 2026-10-27: 14 of 23 sources return no articles, silently

- The last stored scan in `src/state.json` has articles from only 9 sources.
- Missing: Munich Re, ABI, Lloyd's, Hannover Re, GDV, Bank of England, Capgemini, Zurich, AIG (both), Tokio Marine, AXA, BaFin, Geneva Association.
- Likely causes: changed HTML, pages built with JavaScript, or bot blocking. Nothing alerts anyone.
- The new scanner and its health check (`docs/mvp-plan.md`) address this.

## 2026-10-27: A failed source floods the next alert with old articles

- `src/index.js`: a source that errors returns `[]`, and `saveState` then overwrites `state.json` without that source's articles.
- When the source works again, all its current articles look new and get emailed again.

## 2026-10-27: Typo in the Munich Re title selector

- `src/sites.js`: `"div. searchResults__resultPressReleaseTitle"` has a space after `div.`, so it matches nothing.

## 2026-10-27: Alert email has no explicit sender

- `src/utils/email.js` uses `config.emailFrom`, but `CONFIG` in `src/index.js` never sets it. The SMTP server falls back to the login account.
