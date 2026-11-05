-- An email change must pass the allowed list, like a sign-up (docs/mvp-plan.md, "Email change must pass the allowed list").
-- The sign-up check (hook_before_user_created) runs only when an account is created, and Supabase has no hook for
-- email changes.

-- Whether an address may have a Wirescout account: the full address or its domain is on the allowed list.
-- Account settings asks before changing the email, to show a clear message. It runs as its owner because only
-- super admins can read the list, and it answers only true or false.
create function public.email_allowed(address text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_email_domains
    where entry = lower(address) or entry = split_part(lower(address), '@', 2)
  );
$$;

revoke execute on function public.email_allowed(text) from public, anon;
grant execute on function public.email_allowed(text) to authenticated;

-- Every email change goes through here: Supabase first stores the new address in email_change, until it's confirmed.
-- This stops anyone who skips the app.
create function public.check_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.email_allowed(new.email_change) then
    raise exception 'This email isn''t allowed on Wirescout' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Once confirmed (or cancelled), Supabase empties email_change again: that's always fine.
create trigger on_auth_user_email_change_requested
  before update of email_change on auth.users
  for each row
  when (new.email_change is distinct from old.email_change and coalesce(new.email_change, '') <> '')
  execute function public.check_email_change();
