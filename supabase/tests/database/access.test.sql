-- Checks that each journalist only reaches their own data. Run: npx supabase test db
begin;
select plan(12);

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com');

insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000000f1', 'https://example.com/news');
insert into public.articles (source_id, url, title) values
  ('00000000-0000-0000-0000-0000000000f1', 'https://example.com/news/1', 'Story one');

select is(
  (select count(*)::int from public.profiles),
  2,
  'A profile is created for each new user'
);

-- As Alice
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

insert into public.watch_lists (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Regulators');

select is(
  (select name from public.watch_lists),
  'Regulators',
  'A user can create a watch list with just a name'
);

select throws_ok(
  $$ insert into public.watch_lists (name, user_id) values ('Not mine', '00000000-0000-0000-0000-00000000000b') $$,
  '42501',
  null,
  'A user cannot create a watch list for someone else'
);

select throws_ok(
  $$ update public.watch_lists set user_id = '00000000-0000-0000-0000-00000000000b'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501',
  null,
  'A user cannot hand a watch list to someone else'
);

select is(
  (select count(*)::int from public.articles),
  0,
  'Articles are hidden until their source is in one of the user''s lists'
);

insert into public.watch_list_sources (watch_list_id, source_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1');

select is(
  (select count(*)::int from public.articles),
  1,
  'Articles from the user''s sources are visible'
);

select throws_ok(
  $$ update public.profiles set email = 'someone@example.com' $$,
  '42501',
  null,
  'A user cannot change their profile email'
);

-- As Bob
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.watch_lists (name) values ('Disclosures') $$,
  'Another user can create their own watch list'
);

select is(
  (select count(*)::int from public.watch_lists),
  1,
  'A user sees only their own watch lists'
);

select is(
  (select count(*)::int from public.articles),
  0,
  'A user does not see articles from other users'' lists'
);

select throws_ok(
  $$ insert into public.watch_list_sources (watch_list_id, source_id)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1') $$,
  '42501',
  null,
  'A user cannot add sources to someone else''s list'
);

-- Signed out
reset role;
set local role anon;

select is(
  (select count(*)::int from public.watch_lists),
  0,
  'Signed-out visitors see no watch lists'
);

select * from finish();
rollback;
