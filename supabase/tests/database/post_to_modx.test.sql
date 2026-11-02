-- Checks the post-to-MODX tables: users see their own connections but never the session, never write
-- them, and can't touch the publish log. Run: npx supabase test db
begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'jana@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'kofi@example.com');

-- As the functions would (secret key bypasses row-level security; postgres here)
insert into public.magazine_connections (user_id, publication_id, cms_username, session_ciphertext) values
  ('00000000-0000-0000-0000-0000000000c1', 4, 'jana', 'made-up-ciphertext-1'),
  ('00000000-0000-0000-0000-0000000000c2', 4, 'kofi', 'made-up-ciphertext-2');

select throws_ok(
  $$insert into public.magazine_connections (user_id, publication_id, cms_username, session_ciphertext)
    values ('00000000-0000-0000-0000-0000000000c1', 4, 'jana2', 'x')$$,
  '23505',
  null,
  'A user has one connection per magazine'
);

select throws_ok(
  $$insert into public.magazine_connections (user_id, publication_id, cms_username, session_ciphertext)
    values ('00000000-0000-0000-0000-0000000000c2', 1, 'x', 'x'), ('00000000-0000-0000-0000-0000000000c1', 1, 'X', 'x')$$,
  '23505',
  null,
  'Two users cannot connect the same MODX account, whatever the capitals'
);

select lives_ok(
  $$insert into public.magazine_connections (user_id, publication_id, cms_username, session_ciphertext)
    values ('00000000-0000-0000-0000-0000000000c2', 1, 'jana', 'x')$$,
  'The same username on another magazine is a different account'
);

select throws_ok(
  $$update public.magazine_connections set status = 'expired' where cms_username = 'jana'$$,
  '23514',
  null,
  'A connection is connected or needs sign-in, nothing else'
);

select throws_ok(
  $$update public.publications set cms = 'modx', cms_url = null where id = 1$$,
  '23514',
  null,
  'A magazine cannot be half set up for posting'
);

-- As Jana
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);

select is(
  (select cms_username from public.magazine_connections where publication_id = 4),
  'jana',
  'A user reads their own connection'
);

select is(
  (select count(*)::int from public.magazine_connections),
  1,
  'A user does not see other people''s connections'
);

select throws_ok(
  $$select session_ciphertext from public.magazine_connections$$,
  '42501',
  null,
  'A user cannot read the stored session'
);

select throws_ok(
  $$insert into public.magazine_connections (user_id, publication_id, cms_username, session_ciphertext)
    values ('00000000-0000-0000-0000-0000000000c1', 2, 'jana', 'x')$$,
  '42501',
  null,
  'A user cannot add a connection directly'
);

select throws_ok(
  $$update public.magazine_connections set status = 'connected'$$,
  '42501',
  null,
  'A user cannot change a connection'
);

select throws_ok(
  $$delete from public.magazine_connections$$,
  '42501',
  null,
  'A user cannot delete a connection directly (disconnect goes through the function)'
);

select lives_ok(
  $$select cms, cms_url, article_parent_id, article_template_id from public.publications$$,
  'A user reads the magazines'' posting settings'
);

select throws_ok(
  $$select count(*) from public.publish_log$$,
  '42501',
  null,
  'A user cannot read the publish log'
);

select throws_ok(
  $$insert into public.publish_log (user_id, publication_id, action, result)
    values ('00000000-0000-0000-0000-0000000000c1', 4, 'post_draft', 'ok')$$,
  '42501',
  null,
  'A user cannot write the publish log'
);

-- As the functions (secret key)
reset role;
set local role service_role;

select lives_ok(
  $$insert into public.publish_log (user_id, publication_id, action, result, cms_resource_id, ai_assisted)
    values ('00000000-0000-0000-0000-0000000000c1', 4, 'post_draft', 'ok', 501, true)$$,
  'The functions add to the publish log'
);

select lives_ok(
  $$insert into public.publish_log (user_id, publication_id, article_id, action, result)
    values ('00000000-0000-0000-0000-0000000000c1', 4, null, 'draft_text', 'ok')$$,
  'The functions log each suggested draft text'
);

select throws_ok(
  $$update public.publish_log set result = 'error'$$,
  '42501',
  null,
  'Nobody with the secret key can change the publish log'
);

-- Signed out
reset role;
set local role anon;

select throws_ok(
  $$select count(*) from public.magazine_connections$$,
  '42501',
  null,
  'Signed-out visitors cannot read connections'
);

select * from finish();
rollback;
