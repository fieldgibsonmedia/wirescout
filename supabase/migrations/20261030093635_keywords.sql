-- Keywords: a watch list can show only the stories that mention one of its keywords.
-- Empty shows every story. The scanner still saves every story: keywords only hide them.
alter table public.watch_lists
  add column keywords text[] not null default '{}'
    check (cardinality(keywords) <= 20 and length(array_to_string(keywords, ',')) <= 2000);

-- True when the text mentions one of the keywords as a whole word or phrase, ignoring capitals
-- ("AI" matches "New AI rules", not "said"). Always true without keywords.
-- Keywords are matched as plain text: every character that isn't a letter, digit or space is escaped.
create function public.mentions_any(content text, keywords text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(keywords) = 0 or exists (
    select 1
    from unnest(keywords) as keyword
    where content ~* (
      '(^|[^[:alnum:]_])'
      || regexp_replace(keyword, '([^[:alnum:][:space:]])', '\\\1', 'g')
      || '($|[^[:alnum:]_])'
    )
  );
$$;

-- Each watch list's stories that match its keywords: the app's Stories tab, the dashboard counts and
-- (step 5) the digest all read from here, so they always agree.
-- security_invoker: the view runs with the reader's access rules, so users only see their own lists.
create view public.watch_list_articles
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
  -- What keywords and the search box look in. The line break keeps a phrase from spanning title and summary.
  a.title || E'\n' || coalesce(a.summary, '') as search_text
from public.watch_lists wl
join public.watch_list_sources wls on wls.watch_list_id = wl.id
join public.articles a on a.source_id = wls.source_id
where public.mentions_any(a.title || E'\n' || coalesce(a.summary, ''), wl.keywords);

-- The dashboard counts only the stories that match the keywords.
create or replace view public.watch_list_new_counts
with (security_invoker = true)
as
select
  wl.id as watch_list_id,
  (
    select count(*)
    from public.watch_list_articles wla
    where wla.watch_list_id = wl.id and wla.first_seen_at > wl.last_viewed_at
  )::int as new_count
from public.watch_lists wl;
