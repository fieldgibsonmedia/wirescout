-- Document lists: alerts for new bond PDFs on issuers' websites (docs/mvp-plan.md, "Document lists for bond alerts").
-- A news list follows stories, as before. A documents list follows the PDFs on its pages, each labelled by a model.

alter table public.watch_lists
  add column kind text not null default 'news' check (kind in ('news', 'documents'));

-- One page can be followed for its stories and for its PDFs: each is its own source, with its own articles.
alter table public.sources
  add column kind text not null default 'news' check (kind in ('news', 'documents'));
alter table public.sources drop constraint sources_url_key;
alter table public.sources add constraint sources_url_kind_key unique (url, kind);

alter table public.articles
  -- A PDF's section heading on the page ("Green bond reports"): it often says more than the link.
  add column section text,
  -- What the model says a PDF is. Empty: not labelled yet (shown, so nothing is missed).
  add column document_kind text check (
    document_kind in ('allocation_report', 'impact_report', 'framework', 'spo', 'new_issue', 'other')
  ),
  -- Already on the page when the source was first checked: kept, but not news.
  add column found_on_first_check boolean not null default false;

-- The PDFs still to label, for the hourly scanner.
create index articles_unlabelled_idx on public.articles (source_id) where document_kind is null;

-- New columns go at the end (a view's columns can't move). The section joins what keywords and the search box
-- look in; news stories have none, so their text stays the same.
-- counts_as_new: whether a story counts in the new counts (and the digest): never what was on the page at the
-- first check, and in a documents list, only bond documents.
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
  not a.found_on_first_check and (wl.kind = 'news' or a.document_kind is distinct from 'other') as counts_as_new
from public.watch_lists wl
join public.watch_list_sources wls on wls.watch_list_id = wl.id
join public.articles a on a.source_id = wls.source_id
where public.mentions_any(a.title || E'\n' || coalesce(a.summary, '') || coalesce(E'\n' || a.section, ''), wl.keywords);

create or replace view public.watch_list_new_counts
with (security_invoker = true)
as
select
  wl.id as watch_list_id,
  (
    select count(*)
    from public.watch_list_articles wla
    where wla.watch_list_id = wl.id and wla.first_seen_at > wl.last_viewed_at and wla.counts_as_new
  )::int as new_count
from public.watch_lists wl;
