-- Usage, for the monthly report to the Wirescout team (ADMIN_EMAIL): the days each person uses the app,
-- the stories they share and the digest links they open. Users only add their own rows and can't read any:
-- only the report reads them, with the secret key. Journalists are told in one line (sign-up, Account settings).

-- One row per person per day they open the app, in their own time zone.
create table public.active_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

-- Shares (one action per channel) and digest clicks. The story is empty for a digest link to a list.
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  action text not null check (action in ('share_linkedin', 'share_email', 'share_copy_link', 'digest_click')),
  article_id bigint references public.articles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index usage_events_created_at_idx on public.usage_events (created_at);

alter table public.active_days enable row level security;
alter table public.usage_events enable row level security;

revoke all on public.active_days from anon, authenticated;
revoke all on public.usage_events from anon, authenticated;
grant insert (action, article_id) on public.usage_events to authenticated;

-- Only about a story the user can see (row-level security on articles applies inside the check).
create policy "Users record their own usage"
  on public.usage_events for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (article_id is null or exists (select 1 from public.articles where id = article_id))
  );

-- The app calls this on every page it opens; only the first call of the day adds a row.
-- security definer: users can't write active_days directly, so they can't add other days.
create function public.record_active_day()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.active_days (user_id, day)
  select id, (now() at time zone time_zone)::date
  from public.profiles
  where id = (select auth.uid())
  on conflict do nothing;
$$;

revoke execute on function public.record_active_day() from public, anon;
grant execute on function public.record_active_day() to authenticated;

-- When the team was emailed about an access request: each one is sent once.
alter table public.access_requests
  add column notified_at timestamptz;

-- The monthly reports already sent, one row per month reported on (its first day).
create table public.usage_reports (
  month date primary key,
  sent_at timestamptz not null default now()
);

alter table public.usage_reports enable row level security;
revoke all on public.usage_reports from anon, authenticated;

-- Counting starts in October 2026: there's nothing to report for September.
insert into public.usage_reports (month) values ('2026-09-01');
