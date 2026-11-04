-- Checks the System admins tab's functions and that Wirescout always keeps a super admin. Run: npx supabase test db
begin;
select plan(13);

-- Three made-up users: Rosa (the only super admin), Sam and Lee.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'rosa@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'sam@example.com'),
  ('00000000-0000-0000-0000-0000000000d3', 'lee@example.com');

update public.profiles set is_super_admin = true where id = '00000000-0000-0000-0000-0000000000d1';
update public.profiles set full_name = 'Rosa Diaz' where id = '00000000-0000-0000-0000-0000000000d1';

-- As Sam
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}', true);

select is_empty($$ select * from public.super_admins() $$, 'Anyone but a super admin sees no super admins');

select throws_ok(
  $$ select public.add_super_admin('sam@example.com') $$,
  '42501',
  null,
  'Anyone but a super admin cannot add one'
);

select throws_ok(
  $$ select public.remove_super_admin('00000000-0000-0000-0000-0000000000d1') $$,
  '42501',
  null,
  'Anyone but a super admin cannot remove one'
);

-- As Rosa
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.remove_super_admin('00000000-0000-0000-0000-0000000000d1') $$,
  'P0001',
  'Wirescout needs at least one super admin.',
  'The only super admin cannot remove themselves'
);

select is(public.add_super_admin('nobody@example.com'), false, 'An email without an account adds no one');

select is(public.add_super_admin(' SAM@example.com '), true, 'A super admin adds another by their email');

select results_eq(
  $$ select email from public.super_admins() $$,
  $$ values ('rosa@example.com'), ('sam@example.com') $$,
  'A super admin sees every super admin'
);

select lives_ok(
  $$ select public.remove_super_admin('00000000-0000-0000-0000-0000000000d1') $$,
  'A super admin removes themselves when another is left'
);

select is(public.is_super_admin(), false, 'Rosa is no longer a super admin');

-- As Sam, now the only super admin
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.remove_super_admin('00000000-0000-0000-0000-0000000000d2') $$,
  'P0001',
  'Wirescout needs at least one super admin.',
  'The last super admin cannot be removed'
);

-- Back as admin: what the delete-account function and the dashboard's Delete user do.
reset role;

select throws_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-0000000000d2' $$,
  'P0001',
  'Wirescout needs at least one super admin.',
  'The last super admin''s account cannot be deleted'
);

select throws_ok(
  $$ update public.profiles set is_super_admin = false $$,
  'P0001',
  'Wirescout needs at least one super admin.',
  'SQL cannot remove the last super admin either'
);

select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-0000000000d3' $$,
  'Other accounts are deleted as before'
);

select * from finish();
rollback;
