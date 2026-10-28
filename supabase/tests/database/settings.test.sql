-- Checks that each user can change only their own settings. Run: npx supabase test db
begin;
select plan(7);

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000e', 'erin@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'finn@example.com');

select results_eq(
  $$ select digest_time, time_zone from public.profiles where id = '00000000-0000-0000-0000-00000000000e' $$,
  $$ values ('07:00'::time, 'Europe/London') $$,
  'A new user gets the daily digest at 7:00, London time until the app sees their time zone'
);

-- As Erin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}', true);

update public.profiles
set digest_time = null, time_zone = 'Europe/Madrid', share_linkedin = false
where id = '00000000-0000-0000-0000-00000000000e';

select results_eq(
  $$ select digest_time, time_zone, share_linkedin from public.profiles $$,
  $$ values (null::time, 'Europe/Madrid', false) $$,
  'A user can turn their digest off and change their share options'
);

update public.profiles set digest_time = '07:15';

select is(
  (select digest_time from public.profiles),
  '07:15'::time,
  'A user can pick any minute for their digest'
);

select throws_ok(
  $$ update public.profiles set digest_time = '07:15:30' $$,
  '23514',
  null,
  'The digest time is in whole minutes'
);

select throws_ok(
  $$ update public.profiles set time_zone = null $$,
  '23502',
  null,
  'The time zone can''t be empty'
);

update public.profiles set digest_time = '03:00' where id = '00000000-0000-0000-0000-00000000000f';

-- Back as admin, to see every profile
reset role;

select is(
  (select digest_time from public.profiles where id = '00000000-0000-0000-0000-00000000000f'),
  '07:00'::time,
  'A user cannot change someone else''s settings'
);

set local role anon;

select is(
  (select count(*)::int from public.profiles),
  0,
  'Signed-out visitors see no profiles'
);

select * from finish();
rollback;
