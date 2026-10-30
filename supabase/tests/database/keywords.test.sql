-- Checks the watch list keywords: matching, the stories and counts they let through, and who may change them.
-- Run: npx supabase test db
begin;
select plan(14);

-- Matching: whole words or phrases, ignoring capitals.
select ok(public.mentions_any('New AI rules for insurers', '{ai}'), 'A keyword matches whatever its capitals');
select ok(not public.mentions_any('The minister said so', '{ai}'), 'A keyword does not match inside another word');
select ok(public.mentions_any('Flood and Climate Risk report', '{"climate risk"}'), 'A phrase matches as written');
select ok(not public.mentions_any('Climate, risk and more', '{"climate risk"}'), 'A phrase does not match when its words are apart');
select ok(public.mentions_any('Swiss Re news', '{flood,"swiss re"}'), 'One matching keyword is enough');
select ok(public.mentions_any('Anything at all', '{}'), 'No keywords match every story');
select ok(not public.mentions_any('axb', '{a.b}'), 'A keyword is plain text, not a pattern');

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'erin@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'frank@example.com');

insert into public.watch_lists (id, user_id, name, last_viewed_at, keywords) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e1', 'Floods', '2026-01-02', '{flood}');

insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000000e4', 'https://example.net/news');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e4');

-- Two new stories, one mentioning "flood" (in its summary), and one older story that mentions it too.
insert into public.articles (source_id, url, title, summary, first_seen_at) values
  ('00000000-0000-0000-0000-0000000000e4', 'https://example.net/news/1', 'Old storm story', 'Flood losses', '2026-01-01'),
  ('00000000-0000-0000-0000-0000000000e4', 'https://example.net/news/2', 'Quarterly results', null, '2026-01-03'),
  ('00000000-0000-0000-0000-0000000000e4', 'https://example.net/news/3', 'Storm season', 'Flood claims rise', '2026-01-04');

-- As Erin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);

select results_eq(
  $$select url from public.watch_list_articles where watch_list_id = '00000000-0000-0000-0000-0000000000e3' order by url$$,
  $$values ('https://example.net/news/1'), ('https://example.net/news/3')$$,
  'The list shows only the stories that mention its keywords'
);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000000e3'),
  1,
  'The dashboard counts only new stories that mention the keywords'
);

update public.watch_lists set keywords = '{}' where id = '00000000-0000-0000-0000-0000000000e3';

select is(
  (select count(*)::int from public.watch_list_articles where watch_list_id = '00000000-0000-0000-0000-0000000000e3'),
  3,
  'Removing the keywords shows every story again'
);

select throws_ok(
  $$update public.watch_lists set keywords = array(select 'word' || n from generate_series(1, 21) n)
    where id = '00000000-0000-0000-0000-0000000000e3'$$,
  '23514',
  null,
  'A list cannot have more than 20 keywords'
);

-- As Frank
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.watch_list_articles),
  0,
  'A user does not see other users'' stories'
);

update public.watch_lists set keywords = '{hacked}' where id = '00000000-0000-0000-0000-0000000000e3';

-- Back as Erin
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);

select is(
  (select keywords from public.watch_lists where id = '00000000-0000-0000-0000-0000000000e3'),
  '{}'::text[],
  'A user cannot change another user''s keywords'
);

-- Signed out
reset role;
set local role anon;

select is(
  (select count(*)::int from public.watch_list_articles),
  0,
  'Signed-out visitors see no stories'
);

select * from finish();
rollback;
