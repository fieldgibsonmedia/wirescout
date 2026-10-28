-- The daily digest can go out at any minute (e.g. 7:15), not only on the hour.
-- The time zone is no longer picked: the app takes it from the user's browser on every visit, London if it can't.
alter table public.profiles drop constraint profiles_digest_hour_check;

alter table public.profiles rename column digest_hour to digest_time;

alter table public.profiles
  alter column digest_time drop default,
  -- Time of day in time_zone, Monday to Friday, in whole minutes. Null: digest off.
  alter column digest_time type time using make_time(digest_time, 0, 0),
  alter column digest_time set default '07:00',
  add constraint profiles_digest_time_whole_minutes check (extract(second from digest_time) = 0);

update public.profiles set time_zone = 'Europe/London' where time_zone is null;

alter table public.profiles
  alter column time_zone set default 'Europe/London',
  alter column time_zone set not null;

-- Users can still change it themselves.
grant update (digest_time) on public.profiles to authenticated;
