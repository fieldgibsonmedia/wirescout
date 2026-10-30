-- Checks that only the digest sender records when a user's last digest was done. Run: npx supabase test db
begin;
select plan(2);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'grace@example.com');

-- As Grace
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a7", "role": "authenticated"}', true);

select is(
  (select last_digest_at from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'),
  null,
  'A user can read when their last digest was done'
);

select throws_ok(
  $$update public.profiles set last_digest_at = now() where id = '00000000-0000-0000-0000-0000000000a7'$$,
  '42501',
  null,
  'A user cannot change when their last digest was done'
);

select * from finish();
rollback;
