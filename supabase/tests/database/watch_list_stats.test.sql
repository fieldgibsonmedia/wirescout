-- Checks the dashboard's numbers per watch list: sources, failing sources, saved stories, the latest story
-- and the stories per day (through the keywords), and that users only see their own lists.
-- Run: npx supabase test db
begin;
select plan(6);

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'ivy@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'jack@example.com');
update public.profiles set time_zone = 'UTC' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.watch_lists (id, user_id, name, keywords) values
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d1', 'Floods', '{flood}');

-- One working source, one failing (checked, no stories) and one not checked yet.
insert into public.sources (id, url, last_checked_at, stories_found) values
  ('00000000-0000-0000-0000-0000000000d4', 'https://example.net/working', now(), 6),
  ('00000000-0000-0000-0000-0000000000d5', 'https://example.net/failing', now(), 0),
  ('00000000-0000-0000-0000-0000000000d6', 'https://example.net/new', null, null);
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d4'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d5'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d6');

-- Two stories today, one yesterday, one 6 days ago and one a week ago (too old), all mentioning "flood",
-- plus one today that doesn't (hidden by the keywords).
insert into public.articles (id, source_id, url, title, first_seen_at) overriding system value values
  (8001, '00000000-0000-0000-0000-0000000000d4', 'https://example.net/working/1', 'Flood warning', now()),
  (8002, '00000000-0000-0000-0000-0000000000d4', 'https://example.net/working/2', 'Flood claims', now()),
  (8003, '00000000-0000-0000-0000-0000000000d4', 'https://example.net/working/3', 'Flood defences', now() - interval '1 day'),
  (8004, '00000000-0000-0000-0000-0000000000d4', 'https://example.net/working/4', 'Flood report', now() - interval '6 days'),
  (8005, '00000000-0000-0000-0000-0000000000d4', 'https://example.net/working/5', 'Flood season', now() - interval '7 days'),
  (8006, '00000000-0000-0000-0000-0000000000d4', 'https://example.net/working/6', 'Quarterly results', now());

insert into public.saved_stories (watch_list_id, article_id) values
  ('00000000-0000-0000-0000-0000000000d3', 8003);

-- As Ivy
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select is(
  (select source_count from public.watch_list_stats where watch_list_id = '00000000-0000-0000-0000-0000000000d3'),
  3,
  'Counts every source in the list'
);

select is(
  (select failing_count from public.watch_list_stats where watch_list_id = '00000000-0000-0000-0000-0000000000d3'),
  1,
  'Counts only checked sources with no stories as failing'
);

select is(
  (select saved_count from public.watch_list_stats where watch_list_id = '00000000-0000-0000-0000-0000000000d3'),
  1,
  'Counts the saved stories'
);

select is(
  (select latest_story_at from public.watch_list_stats where watch_list_id = '00000000-0000-0000-0000-0000000000d3'),
  now(),
  'Gives when the latest story was found'
);

select is(
  (select daily_counts from public.watch_list_stats where watch_list_id = '00000000-0000-0000-0000-0000000000d3'),
  array[1, 0, 0, 0, 0, 1, 2],
  'Counts the stories per day over the last 7 days, through the keywords, today last'
);

-- As Jack
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.watch_list_stats),
  0,
  'A user does not see other users'' lists'
);

select * from finish();
rollback;
