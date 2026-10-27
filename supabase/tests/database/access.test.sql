-- Checks that each journalist only reaches their own data. Run: npx supabase test db
begin;
select plan(12);

-- Two made-up users: Alice works for one magazine, Bob for two.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com');

insert into public.user_publications (user_id, publication_id)
select '00000000-0000-0000-0000-00000000000a'::uuid, id from public.publications where slug = 'insuranceerm'
union all
select '00000000-0000-0000-0000-00000000000b'::uuid, id from public.publications
where slug in ('insurance-asset-risk', 'corporate-disclosures');

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
  (select p.slug from public.watch_lists w join public.publications p on p.id = w.publication_id),
  'insuranceerm',
  'A single-magazine user gets their magazine set automatically'
);

select throws_ok(
  $$ insert into public.watch_lists (name, publication_id)
     select 'Wrong magazine', id from public.publications where slug = 'environmental-finance' $$,
  '42501',
  null,
  'A user cannot link a watch list to a magazine they do not work for'
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

select throws_ok(
  $$ insert into public.watch_lists (name) values ('No magazine picked') $$,
  '42501',
  null,
  'A multi-magazine user must pick a magazine'
);

select lives_ok(
  $$ insert into public.watch_lists (name, publication_id)
     select 'Disclosures', id from public.publications where slug = 'corporate-disclosures' $$,
  'A multi-magazine user can create a list for either magazine'
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
