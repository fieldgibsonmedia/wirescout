-- Each user's settings: when their daily digest is sent, and which share options their stories show.
alter table public.profiles
  -- Hour of the day (0-23) in time_zone, Monday to Friday. Null: digest off.
  add column digest_hour smallint default 7 check (digest_hour between 0 and 23),
  -- Set by the app from the user's browser the first time they sign in.
  add column time_zone text,
  add column share_linkedin boolean not null default true,
  add column share_email boolean not null default true,
  add column share_copy_link boolean not null default true;

-- Users still can't change their email: only their name and settings.
grant update (digest_hour, time_zone, share_linkedin, share_email, share_copy_link) on public.profiles to authenticated;
