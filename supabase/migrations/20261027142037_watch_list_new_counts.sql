-- New items per watch list, for the dashboard boxes.
-- New = first seen after the user last opened the list.
-- security_invoker: the view runs with the reader's access rules, so users only count their own lists.
create view public.watch_list_new_counts
with (security_invoker = true)
as
select
  wl.id as watch_list_id,
  (
    select count(*)
    from public.watch_list_sources wls
    join public.articles a on a.source_id = wls.source_id
    where wls.watch_list_id = wl.id and a.first_seen_at > wl.last_viewed_at
  )::int as new_count
from public.watch_lists wl;
