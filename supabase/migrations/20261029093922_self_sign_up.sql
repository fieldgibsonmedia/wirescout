-- Self sign-up: anyone with an allowed email can create an account; anyone else can request access.
-- Magazine access is still added by hand (user_publications): signing up gives none.

-- Who may sign up: a whole domain (insuranceerm.com) or one full address (jane@example.com).
-- Edited by Ken in Studio. Nobody can read it through the app.
create table public.allowed_email_domains (
  entry text primary key check (entry = lower(entry)),
  created_at timestamptz not null default now()
);

insert into public.allowed_email_domains (entry) values
  ('fieldgibsonmedia.com'),
  ('environmental-finance.com'),
  ('insuranceassetrisk.com'),
  ('insuranceerm.com'),
  ('corporatedisclosures.org');

alter table public.allowed_email_domains enable row level security;
revoke all on public.allowed_email_domains from anon, authenticated;

-- Supabase calls this before it creates any user (sign-up or invite) and refuses the ones not on the list.
-- Turned on in config.toml ([auth.hook.before_user_created]) and, in the cloud, in the dashboard.
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email text := lower(event -> 'user' ->> 'email');
begin
  if exists (
    select 1 from public.allowed_email_domains
    where entry = email or entry = split_part(email, '@', 2)
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Account creation denied')
  );
end;
$$;

revoke execute on function public.hook_before_user_created from public, anon, authenticated;
grant execute on function public.hook_before_user_created to supabase_auth_admin;

-- "Request access" from people whose email isn't allowed. Ken reads them in Studio,
-- adds the address to allowed_email_domains, replies himself and sets handled_at.
create table public.access_requests (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) between 1 and 100),
  email text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  reason text not null check (length(trim(reason)) between 1 and 1000),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

-- One open request per email, so the same person can't fill the table.
create unique index access_requests_one_open_per_email
  on public.access_requests (lower(email))
  where handled_at is null;

alter table public.access_requests enable row level security;

-- Anyone can send a request; nobody can read or change them through the app.
revoke all on public.access_requests from anon, authenticated;
grant insert (name, email, reason) on public.access_requests to anon, authenticated;

create policy "Anyone sends an access request"
  on public.access_requests for insert to anon, authenticated
  with check (true);

-- The profile keeps the login email: follow it when a user changes their email.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
