-- Which stories were already sent to which magazine, and by whom (Ken, 2026-11-02): journalists at the same
-- magazine can follow the same sources, so the same story could be sent twice, under different titles.
-- The Send dialog warns before sending, and the story card shows "Sent to <magazine>".
-- publish_log stays unreadable for users: this returns only the first successful send per story and magazine,
-- for stories the user can see (the same rule as the articles policy), with the sender's name.
create function public.story_sends(article_ids bigint[])
returns table (
  article_id bigint,
  publication_id smallint,
  sent_at timestamptz,
  sent_by text,
  sent_by_me boolean,
  -- The draft in the magazine's MODX manager, as src/publish/modx.js editLink builds it.
  edit_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (log.article_id, log.publication_id)
    log.article_id,
    log.publication_id,
    log.created_at,
    coalesce(nullif(trim(profile.full_name), ''), 'A colleague'),
    log.user_id = (select auth.uid()),
    publication.cms_url || '/manager/?a=resource/update&id=' || log.cms_resource_id
  from public.publish_log log
  join public.profiles profile on profile.id = log.user_id
  join public.publications publication on publication.id = log.publication_id
  join public.articles article on article.id = log.article_id
  where log.article_id = any (article_ids)
    and log.action = 'post_draft'
    and log.result = 'ok'
    and exists (
      select 1
      from public.watch_list_sources wls
      join public.watch_lists wl on wl.id = wls.watch_list_id
      where wls.source_id = article.source_id and wl.user_id = (select auth.uid())
    )
  order by log.article_id, log.publication_id, log.created_at;
$$;

revoke execute on function public.story_sends(bigint[]) from public, anon;
grant execute on function public.story_sends(bigint[]) to authenticated;
