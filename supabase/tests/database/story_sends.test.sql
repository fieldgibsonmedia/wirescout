-- Checks story_sends: a user sees who already sent a story they can see, and nothing else. Run: npx supabase test db
begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'lena@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'omar@example.com'),
  ('00000000-0000-0000-0000-0000000000d3', 'pia@example.com');
update public.profiles set full_name = 'Omar Test' where id = '00000000-0000-0000-0000-0000000000d2';

-- Lena and Omar follow the same source; Pia follows another one.
insert into public.watch_lists (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d1', 'Lena''s list'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d2', 'Omar''s list'),
  ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000d3', 'Pia''s list');
insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000000d7', 'https://example.com/shared'),
  ('00000000-0000-0000-0000-0000000000d8', 'https://example.com/pia');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d7'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d7'),
  ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000d8');
insert into public.articles (id, source_id, url, title) overriding system value values
  (9201, '00000000-0000-0000-0000-0000000000d7', 'https://example.com/shared/1', 'A shared story'),
  (9202, '00000000-0000-0000-0000-0000000000d7', 'https://example.com/shared/2', 'A story that failed to send');

-- Omar sent story 9201 to Corporate Disclosures (4); Lena's later send and a failed one don't count.
insert into public.publish_log (user_id, publication_id, article_id, action, result, cms_resource_id, created_at) values
  ('00000000-0000-0000-0000-0000000000d2', 4, 9201, 'post_draft', 'ok', 501, now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000d1', 4, 9201, 'post_draft', 'ok', 502, now()),
  ('00000000-0000-0000-0000-0000000000d2', 4, 9202, 'post_draft', 'refused', null, now());

-- As Lena
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select is(
  (select sent_by from public.story_sends(array[9201::bigint])),
  'Omar Test',
  'A user sees who sent a story first'
);

select is(
  (select sent_by_me from public.story_sends(array[9201::bigint])),
  false,
  'It says whether the user sent it themselves'
);

select is(
  (select edit_url from public.story_sends(array[9201::bigint])),
  (select cms_url || '/manager/?a=resource/update&id=501' from public.publications where id = 4),
  'The first send links to its draft'
);

select is(
  (select count(*)::int from public.story_sends(array[9202::bigint])),
  0,
  'A failed send does not count'
);

-- As Pia, who doesn't follow the shared source
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.story_sends(array[9201::bigint])),
  0,
  'A user sees nothing about stories they can''t see'
);

-- Signed out
reset role;
set local role anon;

select throws_ok(
  $$select * from public.story_sends(array[9201::bigint])$$,
  '42501',
  null,
  'Signed-out visitors cannot ask'
);

select * from finish();
rollback;
