-- Checks seen stories and the New rule: a story stays new until it's seen or "Mark all as read", only the list's
-- owner marks or reads them, and the counts follow. Run: npx supabase test db
begin;
select plan(11);

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000005e1', 'iris@example.com'),
  ('00000000-0000-0000-0000-0000000005e2', 'jack@example.com');

insert into public.watch_lists (id, user_id, name, last_viewed_at) values
  ('00000000-0000-0000-0000-0000000005e3', '00000000-0000-0000-0000-0000000005e1', 'Markets', '2026-01-02');

-- Iris's list follows two sources; the third is in no list of hers.
insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000005e4', 'https://example.net/markets'),
  ('00000000-0000-0000-0000-0000000005e5', 'https://example.org/markets'),
  ('00000000-0000-0000-0000-0000000005e6', 'https://example.com/elsewhere');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000005e3', '00000000-0000-0000-0000-0000000005e4'),
  ('00000000-0000-0000-0000-0000000005e3', '00000000-0000-0000-0000-0000000005e5');

-- One story from before "Mark all as read", three after: two from the first source, one from the second.
insert into public.articles (id, source_id, url, title, first_seen_at) overriding system value values
  (9101, '00000000-0000-0000-0000-0000000005e4', 'https://example.net/markets/1', 'Old story', '2026-01-01'),
  (9102, '00000000-0000-0000-0000-0000000005e4', 'https://example.net/markets/2', 'New story', '2026-01-03'),
  (9103, '00000000-0000-0000-0000-0000000005e4', 'https://example.net/markets/3', 'Newer story', '2026-01-04'),
  (9104, '00000000-0000-0000-0000-0000000005e5', 'https://example.org/markets/1', 'Other source', '2026-01-04'),
  (9105, '00000000-0000-0000-0000-0000000005e6', 'https://example.com/elsewhere/1', 'Elsewhere', '2026-01-04');

-- As Iris
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000005e1", "role": "authenticated"}', true);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000005e3'),
  3,
  'Stories found after Mark all as read are new'
);

select lives_ok(
  $$insert into public.seen_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000005e3', 9103)$$,
  'A user marks a story seen in their own list'
);

select is(
  (select is_new from public.watch_list_articles where watch_list_id = '00000000-0000-0000-0000-0000000005e3' and id = 9103),
  false,
  'A seen story is no longer new'
);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000005e3'),
  2,
  'A seen story leaves the new count'
);

select results_eq(
  $$select source_id::text, new_count from public.watch_list_source_new_counts
    where watch_list_id = '00000000-0000-0000-0000-0000000005e3' order by source_id$$,
  $$values ('00000000-0000-0000-0000-0000000005e4', 1), ('00000000-0000-0000-0000-0000000005e5', 1)$$,
  'Each source counts its own new stories'
);

select throws_ok(
  $$insert into public.seen_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000005e3', 9105)$$,
  '42501',
  null,
  'A story from a source the list does not follow cannot be marked seen'
);

-- As Jack
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000005e2", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.seen_stories),
  0,
  'A user does not see what others have seen'
);

select throws_ok(
  $$insert into public.seen_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000005e3', 9102)$$,
  '42501',
  null,
  'A user cannot mark stories seen in someone else''s list'
);

select public.mark_all_read('00000000-0000-0000-0000-0000000005e3');

-- Back as Iris
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000005e1", "role": "authenticated"}', true);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000005e3'),
  2,
  'Someone else''s Mark all as read changes nothing'
);

select public.mark_all_read('00000000-0000-0000-0000-0000000005e3');

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000005e3'),
  0,
  'Mark all as read clears the new count'
);

select is(
  (select count(*)::int from public.seen_stories where watch_list_id = '00000000-0000-0000-0000-0000000005e3'),
  0,
  'Mark all as read clears the list''s seen stories'
);

select * from finish();
rollback;
