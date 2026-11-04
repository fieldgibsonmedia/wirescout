-- Accounts ("After the first journalist", job 2): the super admin, who manages the allowed list in
-- Settings → Manager → System settings. Deleting an account goes through the delete-account function.

-- Set by Ken with one SQL line in the dashboard, never through the app: users may update only the
-- profile columns granted to them, and this isn't one.
alter table public.profiles add column is_super_admin boolean not null default false;

-- Whether the signed-in user is the super admin. Users can read their own profile, so it runs as them.
create function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select is_super_admin from public.profiles where id = (select auth.uid())), false);
$$;

revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- The allowed list (used by the sign-up check): the super admin reads, adds and removes entries.
-- Everyone else still can't read it.
grant select, delete on public.allowed_email_domains to authenticated;
grant insert (entry) on public.allowed_email_domains to authenticated;

create policy "The super admin reads the allowed list"
  on public.allowed_email_domains for select to authenticated
  using ((select public.is_super_admin()));

create policy "The super admin adds to the allowed list"
  on public.allowed_email_domains for insert to authenticated
  with check ((select public.is_super_admin()));

create policy "The super admin removes from the allowed list"
  on public.allowed_email_domains for delete to authenticated
  using ((select public.is_super_admin()));

-- A deleted account keeps its publish log, without the person (Ken, 2026-11-04): the drafts it sent are still
-- in the magazines, so colleagues still see "A former colleague already sent this story".
alter table public.publish_log
  alter column user_id drop not null,
  drop constraint publish_log_user_id_fkey,
  add constraint publish_log_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;

-- As before (20261102154643_story_sends.sql), plus sends from deleted accounts.
create or replace function public.story_sends(article_ids bigint[])
returns table (
  article_id bigint,
  publication_id smallint,
  sent_at timestamptz,
  sent_by text,
  sent_by_me boolean,
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
    case
      when log.user_id is null then 'A former colleague'
      else coalesce(nullif(trim(profile.full_name), ''), 'A colleague')
    end,
    coalesce(log.user_id = (select auth.uid()), false),
    publication.cms_url || '/manager/?a=resource/update&id=' || log.cms_resource_id
  from public.publish_log log
  left join public.profiles profile on profile.id = log.user_id
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
