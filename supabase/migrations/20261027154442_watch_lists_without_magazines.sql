-- Watch lists no longer belong to a magazine: a list is a name plus its sources.
-- The magazine is picked when a story is shared (user_publications still says which ones a user may post to).

drop trigger watch_lists_default_publication on public.watch_lists;
drop function public.set_default_publication();

drop policy "Users create watch lists for their magazines" on public.watch_lists;
drop policy "Users update their own watch lists" on public.watch_lists;

alter table public.watch_lists drop column publication_id;

create policy "Users create their own watch lists"
  on public.watch_lists for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own watch lists"
  on public.watch_lists for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
