# Known issues

Bugs found while working on something else. One entry each: date, what, where, how to see it.

## 2026-10-29: 10 of the 23 old sources can't be read without a browser

- Munich Re, Lloyd's, Hannover Re, Bank of England, Gallagher Re, Zurich, AIG (global), Tokio Marine, BaFin, Geneva Association: their pages build the story list with JavaScript, or turn away anything that isn't a browser. (Count from 2026-10-29; BaFin and Munich Re have stories only in menus.)
- The scanner shows them as "No stories found" and the health email lists them on their first check.
- Waiting on the AI fallback decision (`docs/mvp-plan.md`, "Scanning without selectors"), once we know how many sources journalists add fail.

## 2026-10-29: The same page can be added twice, as `http://` and `https://`

- Sources are matched by their exact address, so `http://news.example.com/press` and `https://news.example.com/press` are two sources, scanned twice and shown twice in the list.

## 2026-10-29: A guessed or linked feed can hold more than the page

- When a page names a site-wide feed, or the scanner guesses `/feed`, the feed can include stories the page doesn't show (e.g. blog posts next to press releases). Seen on AXA XL and Capgemini.
- See it: the source's `feed_url` in Table Editor → `sources`.

## 2026-10-29: An email change isn't checked against the allowed list

- The sign-up check (`hook_before_user_created`) only runs when an account is created.
- A signed-in user can change their email to any address in Account settings, after confirming from both addresses.
- Low risk for an internal tool: they already had an allowed email.

## 2026-10-27: An access test fails when the local database has users

- `supabase/tests/database/access.test.sql`, "A profile is created for each new user", counts every profile and expects 2.
- Invite a local test user, then run `npx supabase test db`: it fails with "have: 4, want: 2". Passes after `npx supabase db reset`.

## 2026-10-27: `npm audit` reports high-severity issues in `nodemailer` and `undici`

- `nodemailer` 6.10.1 (direct dependency) and `undici` 7.18.2 (through `cheerio`). Already on `main`, not added by the Supabase work.
- See them with `npm audit`. Fixing `nodemailer` needs a major upgrade.
