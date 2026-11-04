-- Checks that sign-up records when the privacy policy was accepted. Run: npx supabase test db
begin;
select plan(4);

-- Made-up users: one from the sign-up form (privacy_accepted), one made without it (e.g. in the dashboard),
-- and one with an odd value.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'ada@example.com', '{"privacy_accepted": true}'),
  ('00000000-0000-0000-0000-0000000000e2', 'bob@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000e3', 'cy@example.com', '{"privacy_accepted": "maybe"}');

select is(
  (select privacy_accepted_at from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  now(),
  'Signing up through the form records when the privacy policy was accepted'
);

select ok(
  (select privacy_accepted_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000000e2')
  and (select privacy_accepted_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000000e3'),
  'Without it, or with an odd value, nothing is recorded and the account is still made'
);

-- As Bob
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated"}', true);

select throws_ok(
  $$ update public.profiles set privacy_accepted_at = now() $$,
  '42501',
  null,
  'A user cannot set the date themselves'
);

select is(
  (select email from public.profiles),
  'bob@example.com',
  'Users still read only their own profile'
);

select * from finish();
rollback;
