-- Document lists in the app (docs/mvp-plan.md, "Document lists for bond alerts").

-- Users add a documents list's sources themselves: they may set its kind, like its address (the scanner writes the rest).
grant insert (kind) on public.sources to authenticated;

-- The dashboard's numbers count what counts as new (docs/mvp-plan.md, "Document lists for bond alerts"): the PDFs
-- on a documents list's pages at their first check, and its "other" PDFs, no longer show as a jump in its chart or as
-- its latest story. News lists don't change: every story of theirs counts.
create or replace view public.watch_list_stats
with (security_invoker = true)
as
select
  wl.id as watch_list_id,
  (select count(*) from public.watch_list_sources wls where wls.watch_list_id = wl.id)::int as source_count,
  -- Failing as in the app and the digest: checked, and no stories found.
  (
    select count(*)
    from public.watch_list_sources wls
    join public.sources s on s.id = wls.source_id
    where wls.watch_list_id = wl.id and s.last_checked_at is not null and coalesce(s.stories_found, 0) = 0
  )::int as failing_count,
  (select count(*) from public.saved_stories ss where ss.watch_list_id = wl.id)::int as saved_count,
  (
    select max(wla.first_seen_at) from public.watch_list_articles wla where wla.watch_list_id = wl.id and wla.counts_as_new
  ) as latest_story_at,
  -- Stories found per day in the user's time zone, oldest first, today last: always 7 numbers.
  (
    select array_agg(coalesce(day_counts.story_count, 0) order by days.day)
    from generate_series(user_day.today - 6, user_day.today, interval '1 day') as days (day)
    left join (
      select (wla.first_seen_at at time zone p.time_zone)::date as day, count(*)::int as story_count
      from public.watch_list_articles wla
      where wla.watch_list_id = wl.id and wla.counts_as_new and wla.first_seen_at > now() - interval '8 days'
      group by 1
    ) day_counts on day_counts.day = days.day::date
  ) as daily_counts
from public.watch_lists wl
join public.profiles p on p.id = wl.user_id
cross join lateral (select (now() at time zone p.time_zone)::date as today) user_day;
