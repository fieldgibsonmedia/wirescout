-- When each person agreed to the privacy policy (Ken, 2026-11-04): the sign-up form requires it and sends
-- privacy_accepted with the account (user metadata). The time comes from the database, never the browser, and
-- users can't change it: it isn't one of the profile columns granted to them. Accounts made before this stay empty.
alter table public.profiles add column privacy_accepted_at timestamptz;

-- As before (20261027121555_initial_schema.sql), plus the time the privacy policy was accepted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, privacy_accepted_at)
  values (
    new.id,
    new.email,
    -- Compared as text: a cast would refuse the whole sign-up if someone sent something odd.
    case when new.raw_user_meta_data ->> 'privacy_accepted' = 'true' then now() end
  );
  return new;
end;
$$;
