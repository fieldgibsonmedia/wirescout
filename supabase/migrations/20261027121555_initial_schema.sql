-- Wirescout initial schema: users, magazines, watch lists, sources and articles.
-- Every table has row-level security: a journalist only sees their own watch lists
-- and the articles from those lists' sources. The scanner uses the service role.

-- Magazines a story can be posted to.
create table public.publications (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

insert into public.publications (slug, name) values
  ('environmental-finance', 'Environmental Finance'),
  ('insuranceerm', 'InsuranceERM'),
  ('insurance-asset-risk', 'Insurance Asset Risk'),
  ('corporate-disclosures', 'Corporate Disclosures');

-- One profile per signed-in user, created automatically on invite.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Which magazines each user may post to. Managed by Ken in the Supabase dashboard.
create table public.user_publications (
  user_id uuid not null references public.profiles (id) on delete cascade,
  publication_id smallint not null references public.publications (id),
  primary key (user_id, publication_id)
);

-- A user's watch list, linked to exactly one magazine.
create table public.watch_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  publication_id smallint not null references public.publications (id),
  name text not null,
  -- Articles first seen after this time count as new on the dashboard.
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index watch_lists_user_id_idx on public.watch_lists (user_id);

-- Users with a single magazine never pick one: it is set for them.
create function public.set_default_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publication_id is null
    and (select count(*) from public.user_publications where user_id = new.user_id) = 1 then
    select publication_id into new.publication_id
    from public.user_publications
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger watch_lists_default_publication
  before insert on public.watch_lists
  for each row execute function public.set_default_publication();

-- A news source, shared by every watch list that uses its URL, so it is scanned once.
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table public.watch_list_sources (
  watch_list_id uuid not null references public.watch_lists (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (watch_list_id, source_id)
);

create index watch_list_sources_source_id_idx on public.watch_list_sources (source_id);

-- Articles found by the scanner.
create table public.articles (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.sources (id) on delete cascade,
  url text not null,
  title text not null,
  summary text,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  unique (source_id, url)
);

create index articles_source_first_seen_idx on public.articles (source_id, first_seen_at desc);

-- Row-level security

alter table public.publications enable row level security;
alter table public.profiles enable row level security;
alter table public.user_publications enable row level security;
alter table public.watch_lists enable row level security;
alter table public.sources enable row level security;
alter table public.watch_list_sources enable row level security;
alter table public.articles enable row level security;

create policy "Signed-in users read publications"
  on public.publications for select to authenticated
  using (true);

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users can't change their own email: it must match the login account.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Users read their own publications"
  on public.user_publications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users read their own watch lists"
  on public.watch_lists for select to authenticated
  using (user_id = (select auth.uid()));

-- A watch list can only be linked to a magazine the user may post to.
create policy "Users create watch lists for their magazines"
  on public.watch_lists for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.user_publications
      where user_id = (select auth.uid()) and publication_id = watch_lists.publication_id
    )
  );

create policy "Users update their own watch lists"
  on public.watch_lists for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.user_publications
      where user_id = (select auth.uid()) and publication_id = watch_lists.publication_id
    )
  );

create policy "Users delete their own watch lists"
  on public.watch_lists for delete to authenticated
  using (user_id = (select auth.uid()));

-- Sources are public news URLs: any signed-in user can read and add them.
-- Only the scanner (service role) changes or deletes them.
create policy "Signed-in users read sources"
  on public.sources for select to authenticated
  using (true);

create policy "Signed-in users add sources"
  on public.sources for insert to authenticated
  with check (true);

create policy "Users read sources in their watch lists"
  on public.watch_list_sources for select to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );

create policy "Users add sources to their watch lists"
  on public.watch_list_sources for insert to authenticated
  with check (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );

create policy "Users remove sources from their watch lists"
  on public.watch_list_sources for delete to authenticated
  using (
    exists (
      select 1 from public.watch_lists
      where id = watch_list_id and user_id = (select auth.uid())
    )
  );

create policy "Users read articles from their watch lists' sources"
  on public.articles for select to authenticated
  using (
    exists (
      select 1
      from public.watch_list_sources wls
      join public.watch_lists wl on wl.id = wls.watch_list_id
      where wls.source_id = articles.source_id and wl.user_id = (select auth.uid())
    )
  );
