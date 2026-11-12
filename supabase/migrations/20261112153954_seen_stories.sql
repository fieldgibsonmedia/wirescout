-- New stays until seen (docs/mvp-plan.md, "Feedback from PostHog recordings", job 4): a story loses its New mark
-- once its headline has been on the reader's screen, or they opened it, not when they open the list. Opening the
-- list no longer moves watch_lists.last_viewed_at: only "Mark all as read" does. So stories found since the last
-- visit stay new at release, as before.

-- The stories a user has seen in one of their watch lists. They belong to the list, like saved stories.
create table public.seen_stories (
  watch_list_id uuid not null references public.watch_lists (id) on delete cascade,
  article_id bigint not null references public.articles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (watch_list_id, article_id)
);

create index seen_stories_article_id_idx on public.seen_stories (article_id);

alter table public.seen_stories enable row level security;

revoke all on public.seen_stories from anon, authenticated;
grant select, delete on public.seen_stories to authenticated;
grant insert (watch_list_id, article_id) on public.seen_stories to authenticated;

create policy "Users read seen stories in their watch lists"
  on public.seen_stories for select to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );

-- Only a story from one of the list's sources.
create policy "Users mark stories seen in their watch lists"
  on public.seen_stories for insert to authenticated
  with check (
    exists (
      select 1
      from public.watch_lists wl
      join public.watch_list_sources wls on wls.watch_list_id = wl.id
      join public.articles a on a.source_id = wls.source_id
      where wl.id = watch_list_id and wl.user_id = (select auth.uid()) and a.id = article_id
    )
  );

create policy "Users clear seen stories in their watch lists"
  on public.seen_stories for delete to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );

-- is_new: the story's New mark, the one rule for the app's marks and counts: it counts as new, was found after
-- "Mark all as read", and hasn't been seen.
create or replace view public.watch_list_articles
with (security_invoker = true)
as
select
  wl.id as watch_list_id,
  a.id,
  a.source_id,
  a.url,
  a.title,
  a.summary,
  a.published_at,
  a.first_seen_at,
  a.title || E'\n' || coalesce(a.summary, '') || coalesce(E'\n' || a.section, '') as search_text,
  a.section,
  a.document_kind,
  not a.found_on_first_check and not a.is_reupload
    and (wl.kind = 'news' or a.document_kind is distinct from 'other') as counts_as_new,
  not a.found_on_first_check and not a.is_reupload
    and (wl.kind = 'news' or a.document_kind is distinct from 'other')
    and a.first_seen_at > wl.last_viewed_at
    and not exists (select 1 from public.seen_stories ss where ss.watch_list_id = wl.id and ss.article_id = a.id) as is_new
from public.watch_lists wl
join public.watch_list_sources wls on wls.watch_list_id = wl.id
join public.articles a on a.source_id = wls.source_id
where public.mentions_any(a.title || E'\n' || coalesce(a.summary, '') || coalesce(E'\n' || a.section, ''), wl.keywords);

create or replace view public.watch_list_new_counts
with (security_invoker = true)
as
select
  wl.id as watch_list_id,
  (select count(*) from public.watch_list_articles wla where wla.watch_list_id = wl.id and wla.is_new)::int as new_count
from public.watch_lists wl;

-- Each source's new stories in a list, for the Sources dropdown ("BBC (8)"). Sources without any aren't listed.
create view public.watch_list_source_new_counts
with (security_invoker = true)
as
select watch_list_id, source_id, count(*)::int as new_count
from public.watch_list_articles
where is_new
group by watch_list_id, source_id;

-- "Mark all as read": every story found until now loses its New mark. The list's seen stories are then all older,
-- so they go. The reader's own access rules apply: only their own list changes.
create function public.mark_all_read(list_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.watch_lists set last_viewed_at = now() where id = list_id;
  delete from public.seen_stories where watch_list_id = list_id;
$$;

revoke execute on function public.mark_all_read(uuid) from public, anon;
grant execute on function public.mark_all_read(uuid) to authenticated;
