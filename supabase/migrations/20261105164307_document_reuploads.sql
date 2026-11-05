-- Re-uploaded PDFs (docs/mvp-plan.md, "Document lists for bond alerts", job A): an issuer often puts the same
-- document up again under a new file name (1763545120-green-financing-framework.pdf). The scanner marks it, so
-- it shows under All PDFs but never as new or in the digest.

alter table public.articles
  -- Same title and same file name, apart from its numbers, as a PDF already saved from this source.
  add column is_reupload boolean not null default false;

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
    and (wl.kind = 'news' or a.document_kind is distinct from 'other') as counts_as_new
from public.watch_lists wl
join public.watch_list_sources wls on wls.watch_list_id = wl.id
join public.articles a on a.source_id = wls.source_id
where public.mentions_any(a.title || E'\n' || coalesce(a.summary, '') || coalesce(E'\n' || a.section, ''), wl.keywords);
