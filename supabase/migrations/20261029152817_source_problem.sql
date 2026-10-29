-- Why the scanner couldn't read a source in its last check, shown in the app with a Fix button:
-- the page doesn't exist, the site turns the scanner away, or the site can't be reached.
-- Empty when the source was read, or failed for another reason ("No stories found").
alter table public.sources
  add column problem text check (problem in ('not_found', 'blocked', 'unreachable'));

-- Fixing a source swaps it for another in the user's list (the shared source keeps its address).
-- Both the old and the new row must be in one of the user's own lists.
create policy "Users change sources in their watch lists"
  on public.watch_list_sources for update to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );
