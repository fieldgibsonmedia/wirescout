# Ideas

Ideas not planned yet, with what we know about them. Newest first. Each one needs data that it helps users before it gets a plan (Ken, 2026-11-05).

## Stories grouped and filtered by date (Ken, 2026-11-05)

The idea: a list's stories (news and documents) under headings by when they were found (Today, This week, Last month, Last 6 months, Last year, Older), and a filter icon next to the view switch that opens a time range (Today | This week | Last month | Last 6 months | Last year | All).

Postponed (Ken, 2026-11-05), because:

- Documents lists: Rishi's whole list, uploaded locally, has 10,943 PDFs, of which 10,940 were found at the first check, on the same day. By date found they'd all sit under one heading for weeks, and a time range wouldn't narrow anything. The useful date would be the document's own, which the pages don't give.
- "What's new since I last looked" is already answered by the New marker, the badge and the daily digest.
- No data yet that anyone reads far down a list: one journalist for 2 days, and the bond team hasn't started.

What would bring it back:

- `load_more` (from the next release, with `list_kind`) shows people reading past the first 50 stories, after 2 to 3 weeks of the bond team using Wirescout. Check in PostHog, or Analytics → Features used.
- Then look first at showing the document's own date, rather than the date found.
