-- Checks saved stories: who may save, see and remove them, and that they go with their watch list.
-- Run: npx supabase test db
begin;
select plan(10);

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'gina@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'hugo@example.com');

insert into public.watch_lists (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f1', 'Regulators');

-- Gina's list follows one source; the other source is in no list of hers.
insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000000f4', 'https://example.net/press'),
  ('00000000-0000-0000-0000-0000000000f5', 'https://example.org/news');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4');

insert into public.articles (id, source_id, url, title) overriding system value values
  (9001, '00000000-0000-0000-0000-0000000000f4', 'https://example.net/press/1', 'New solvency rules'),
  (9002, '00000000-0000-0000-0000-0000000000f5', 'https://example.org/news/1', 'Elsewhere');

-- As Gina
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}', true);

select lives_ok(
  $$insert into public.saved_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000000f3', 9001)$$,
  'A user saves a story in their own list'
);

select is(
  (select count(*)::int from public.saved_stories where watch_list_id = '00000000-0000-0000-0000-0000000000f3'),
  1,
  'A user sees the saved stories in their own list'
);

select throws_ok(
  $$insert into public.saved_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000000f3', 9002)$$,
  '42501',
  null,
  'A user cannot save a story from a source the list does not follow'
);

select throws_ok(
  $$update public.saved_stories set saved_at = '2020-01-01' where article_id = 9001$$,
  '42501',
  null,
  'A user cannot change when a story was saved'
);

-- As Hugo
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.saved_stories),
  0,
  'A user does not see other users'' saved stories'
);

select throws_ok(
  $$insert into public.saved_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000000f3', 9001)$$,
  '42501',
  null,
  'A user cannot save a story in another user''s list'
);

delete from public.saved_stories where article_id = 9001;

-- Back as Gina
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.saved_stories),
  1,
  'Another user cannot remove a user''s saved story'
);

delete from public.saved_stories where article_id = 9001;

select is(
  (select count(*)::int from public.saved_stories),
  0,
  'A user removes a saved story'
);

insert into public.saved_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000000f3', 9001);
delete from public.watch_lists where id = '00000000-0000-0000-0000-0000000000f3';

reset role;

select is(
  (select count(*)::int from public.saved_stories where article_id = 9001),
  0,
  'Deleting the list removes its saved stories'
);

-- Signed out
set local role anon;

select throws_ok(
  $$select * from public.saved_stories$$,
  '42501',
  null,
  'Signed-out visitors cannot read saved stories'
);

select * from finish();
rollback;
