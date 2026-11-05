# Known issues

Bugs found while working on something else. One entry each: date, what, where, how to see it.

## 2026-10-30: GitHub starts scheduled runs late

- The scanner, set for :17, ran at 09:58 and 10:54 UTC on 2026-10-30: about 40 minutes late. The digest's first scheduled run (11:19) didn't happen at all after the merge; Ken started it by hand.
- So a digest can arrive 30–60 minutes after the chosen time.
- 2026-11-03: the digest, set for every 15 minutes, ran only about once an hour on 2–3 November (35 runs in 35 hours). If that's too late, a more punctual trigger (an outside scheduler starting the workflow) is an option.
- See it: GitHub → Actions → a workflow's runs, against its cron times.

## 2026-10-29: 10 of the 23 old sources can't be read without a browser

- Munich Re, Lloyd's, Hannover Re, Bank of England, Gallagher Re, Zurich, AIG (global), Tokio Marine, BaFin, Geneva Association: their pages build the story list with JavaScript, or turn away anything that isn't a browser. (Count from 2026-10-29; BaFin and Munich Re have stories only in menus.)
- The scanner shows them as "No stories found" and the health email lists them on their first check.
- Waiting on the AI fallback decision (`docs/mvp-plan.md`, "Scanning without selectors"), once we know how many sources journalists add fail.
- Count on live, 2026-11-05: none of the sources in watch lists shows "No stories found"; 8 of 71 are blocked. The browser fix is shelved (`docs/mvp-plan.md`, "Pages built with JavaScript").

## 2026-10-29: A guessed or linked feed can hold more than the page

- Fixed on 2026-11-05 when the page shows its own stories: a feed it names is used only if it matches them (`feedMatchesPage`, `src/scanner/read-source.js`).
- Still open when the scanner can't read the page's own stories (e.g. built with JavaScript): any feed the page names, or a guessed `/feed`, is used, and can hold more than the page. Capgemini (`/news/press-releases/`) still reads the site-wide `/feed/` (checked 2026-11-05; why not checked).
- See it: the source's `feed_url` in Table Editor → `sources`.

## 2026-10-29: An email change isn't checked against the allowed list

- The sign-up check (`hook_before_user_created`) only runs when an account is created.
- A signed-in user can change their email to any address in Account settings, after confirming from both addresses.
- Low risk for an internal tool: they already had an allowed email.
- Fixed in v0.6.2 (2026-11-05, live once released): the database refuses the change, and Account settings says why (`docs/mvp-plan.md`, "Email change must pass the allowed list").
