-- Checks the dashboard's new-item counts. Run: npx supabase test db
begin;
select plan(5);

-- Two made-up users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dan@example.com');

insert into public.watch_lists (id, user_id, name, last_viewed_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', 'Climate', '2026-01-02');

insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000000f2', 'https://example.org/press');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f2');

-- One article seen before Carol last opened the list, two after.
insert into public.articles (source_id, url, title, first_seen_at) values
  ('00000000-0000-0000-0000-0000000000f2', 'https://example.org/press/1', 'Old story', '2026-01-01'),
  ('00000000-0000-0000-0000-0000000000f2', 'https://example.org/press/2', 'New story', '2026-01-03'),
  ('00000000-0000-0000-0000-0000000000f2', 'https://example.org/press/3', 'Newer story', '2026-01-04');

-- As Carol
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000000c1'),
  2,
  'Only articles first seen after the list was last opened count as new'
);

update public.watch_lists set last_viewed_at = '2026-01-05'
where id = '00000000-0000-0000-0000-0000000000c1';

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000000c1'),
  0,
  'Opening the list clears its new count'
);

-- As Dan
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.watch_list_new_counts),
  0,
  'A user does not see other users'' counts'
);

update public.watch_lists set last_viewed_at = '2026-01-01'
where id = '00000000-0000-0000-0000-0000000000c1';

-- Back as Carol
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000000c1'),
  0,
  'A user cannot reset another user''s new count'
);

-- Signed out
reset role;
set local role anon;

select is(
  (select count(*)::int from public.watch_list_new_counts),
  0,
  'Signed-out visitors see no counts'
);

select * from finish();
rollback;
