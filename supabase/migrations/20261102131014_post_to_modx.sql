-- Post to MODX (step 6, docs/post-to-modx-plan.md): the site registry, journalists' magazine connections,
-- and the publish log. Only the Edge Functions (secret key) write connections and the log: they hold the
-- encrypted MODX sessions, which must never reach the app.

-- The site registry: how to post to each magazine. Filled by hand per magazine (production step 3).
alter table public.publications
  add column cms text check (cms in ('modx', 'statamic')),
  add column cms_url text,
  add column article_parent_id integer,
  add column article_template_id integer,
  -- A magazine is either not set up yet, or fully set up: never half.
  add constraint publications_cms_complete check (
    cms is null
    or (cms_url is not null and article_parent_id is not null and article_template_id is not null)
  );

-- A journalist's own MODX account on one magazine. The password is never stored: only the MODX session
-- (cookie and token), encrypted by the function with MAGAZINE_SESSION_KEY.
create table public.magazine_connections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  publication_id smallint not null references public.publications (id),
  cms_username text not null,
  session_ciphertext text not null,
  status text not null default 'connected' check (status in ('connected', 'needs_sign_in')),
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (user_id, publication_id)
);

-- One Wirescout user per MODX account: own accounts only (decided 2026-11-02).
-- lower(): MODX finds usernames ignoring capitals, so "Ken" and "ken" are the same account.
create unique index magazine_connections_one_user_per_account
  on public.magazine_connections (publication_id, lower(cms_username));

-- Every connect, disconnect and draft sent. Insert-only: the usage report counts posts from it.
create table public.publish_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  publication_id smallint not null references public.publications (id),
  article_id bigint references public.articles (id) on delete set null,
  action text not null check (action in ('connect', 'disconnect', 'post_draft')),
  -- ok: done. refused: MODX said no (wrong password, expired session, no permission). error: anything else.
  result text not null check (result in ('ok', 'refused', 'error')),
  -- The new draft's id in MODX, for post_draft.
  cms_resource_id integer,
  -- For us only: the journalist started from the suggested text. Never shown in the draft.
  ai_assisted boolean not null default false,
  created_at timestamptz not null default now()
);

create index publish_log_created_at_idx on public.publish_log (created_at);

alter table public.magazine_connections enable row level security;
alter table public.publish_log enable row level security;

-- Users read their own connections, every column except the session. They never write them:
-- connect and disconnect go through the magazine-connect function, so the MODX logout happens too.
revoke all on public.magazine_connections from anon, authenticated;
grant select (user_id, publication_id, cms_username, status, connected_at, last_used_at)
  on public.magazine_connections to authenticated;

create policy "Users read their own magazine connections"
  on public.magazine_connections for select to authenticated
  using (user_id = (select auth.uid()));

-- The log: users can't read or write it. The functions only add rows.
revoke all on public.publish_log from anon, authenticated;
revoke update, delete, truncate on public.publish_log from service_role;
