-- Saved stories: a user keeps a story for later in one of their watch lists (the Stories tab's Saved view).
-- Saved stories belong to the list, so deleting the list removes them.
create table public.saved_stories (
  watch_list_id uuid not null references public.watch_lists (id) on delete cascade,
  article_id bigint not null references public.articles (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (watch_list_id, article_id)
);

create index saved_stories_article_id_idx on public.saved_stories (article_id);

alter table public.saved_stories enable row level security;

-- Save and remove only: saved_at is always the time of the save.
revoke all on public.saved_stories from anon, authenticated;
grant select, delete on public.saved_stories to authenticated;
grant insert (watch_list_id, article_id) on public.saved_stories to authenticated;

create policy "Users read saved stories in their watch lists"
  on public.saved_stories for select to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );

-- Only a story from one of the list's sources.
create policy "Users save stories in their watch lists"
  on public.saved_stories for insert to authenticated
  with check (
    exists (
      select 1
      from public.watch_lists wl
      join public.watch_list_sources wls on wls.watch_list_id = wl.id
      join public.articles a on a.source_id = wls.source_id
      where wl.id = watch_list_id and wl.user_id = (select auth.uid()) and a.id = article_id
    )
  );

create policy "Users remove saved stories from their watch lists"
  on public.saved_stories for delete to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );
