-- System admins (Ken, 2026-11-04): super admins add and remove each other in Settings → Manager →
-- System settings → System admins, and Wirescout always keeps at least one. The first one is still set with
-- one SQL line in the dashboard (docs/project.md, Admin tasks).

-- Refuses to remove the last super admin, whatever removes them: the System admins tab, deleting the account
-- (in the app or the dashboard, which deletes the profile with it) or SQL.
create function public.keep_a_super_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- One change at a time, so two super admins removing each other at once can't both pass.
  perform pg_advisory_xact_lock(hashtext('public.keep_a_super_admin'));

  if old.is_super_admin
    and (tg_op = 'DELETE' or not new.is_super_admin)
    and not exists (select 1 from public.profiles where is_super_admin and id <> old.id)
  then
    raise exception 'Wirescout needs at least one super admin.' using hint = 'Make someone else a super admin first.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger keep_a_super_admin
  before update of is_super_admin or delete on public.profiles
  for each row execute function public.keep_a_super_admin();

-- The super admins, by name, for the System admins tab. Only a super admin sees them: users read only their own
-- profile, so this runs as the owner.
create function public.super_admins()
returns table (id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, full_name, email
  from public.profiles
  where is_super_admin and (select public.is_super_admin())
  order by lower(coalesce(nullif(trim(full_name), ''), email));
$$;

-- Makes the account with this email a super admin. False when there's no such account (they sign up first).
create function public.add_super_admin(account_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can add one.' using errcode = '42501';
  end if;

  update public.profiles set is_super_admin = true where lower(email) = lower(trim(account_email));
  return found;
end;
$$;

-- Takes the role away, from someone else or yourself. The trigger above keeps the last one.
create function public.remove_super_admin(admin_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can remove one.' using errcode = '42501';
  end if;

  update public.profiles set is_super_admin = false where id = admin_id;
end;
$$;

revoke execute on function public.super_admins(), public.add_super_admin(text), public.remove_super_admin(uuid) from public, anon;
grant execute on function public.super_admins(), public.add_super_admin(text), public.remove_super_admin(uuid) to authenticated;
