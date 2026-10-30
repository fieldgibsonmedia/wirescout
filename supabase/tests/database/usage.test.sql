-- Checks that users can only add their own usage, and can't read anyone's. Run: npx supabase test db
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'hana@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'ivan@example.com');

insert into public.watch_lists (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Hana''s list');
insert into public.sources (id, url) values
  ('00000000-0000-0000-0000-0000000000b4', 'https://example.com/hana'),
  ('00000000-0000-0000-0000-0000000000b5', 'https://example.com/other');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b4');
insert into public.articles (id, source_id, url, title) overriding system value values
  (9001, '00000000-0000-0000-0000-0000000000b4', 'https://example.com/hana/1', 'Hana''s story'),
  (9002, '00000000-0000-0000-0000-0000000000b5', 'https://example.com/other/1', 'Someone else''s story');

-- As Hana
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

select lives_ok(
  $$select public.record_active_day(); select public.record_active_day();$$,
  'A user records the day they use the app'
);

select lives_ok(
  $$insert into public.usage_events (action, article_id) values ('share_linkedin', 9001), ('digest_click', null)$$,
  'A user records sharing a story they see, and a digest click'
);

select throws_ok(
  $$insert into public.usage_events (action, article_id) values ('share_email', 9002)$$,
  '42501',
  null,
  'A user cannot record sharing a story they can''t see'
);

select throws_ok(
  $$insert into public.usage_events (user_id, action) values ('00000000-0000-0000-0000-0000000000b2', 'digest_click')$$,
  '42501',
  null,
  'A user cannot record usage for someone else'
);

select throws_ok(
  $$insert into public.active_days (user_id, day) values ('00000000-0000-0000-0000-0000000000b1', '2026-01-01')$$,
  '42501',
  null,
  'A user cannot add days directly'
);

select throws_ok(
  $$select count(*) from public.usage_events$$,
  '42501',
  null,
  'A user cannot read usage'
);

select throws_ok(
  $$select count(*) from public.usage_reports$$,
  '42501',
  null,
  'A user cannot read which reports were sent'
);

-- As the report (secret key)
reset role;

select is(
  (select count(*)::int from public.active_days where user_id = '00000000-0000-0000-0000-0000000000b1'),
  1,
  'Opening the app many times in a day counts one day'
);

-- Signed out
set local role anon;

select throws_ok(
  $$select public.record_active_day()$$,
  '42501',
  null,
  'Signed-out visitors cannot record a day'
);

select * from finish();
rollback;
