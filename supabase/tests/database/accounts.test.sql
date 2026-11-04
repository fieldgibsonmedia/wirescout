-- Checks the super admin and deleting an account. Run: npx supabase test db
begin;
select plan(15);

-- Two made-up users: Rosa (the super admin) and Sam.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'rosa@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'sam@example.com');

select is(
  (select is_super_admin from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'),
  false,
  'A new user is not the super admin'
);

update public.profiles set is_super_admin = true where id = '00000000-0000-0000-0000-0000000000c1';

-- As Sam
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated"}', true);

select throws_ok(
  $$ update public.profiles set is_super_admin = true $$,
  '42501',
  null,
  'A user cannot make themselves the super admin'
);

select is(public.is_super_admin(), false, 'Sam is not the super admin');

select is_empty($$ select * from public.allowed_email_domains $$, 'Anyone but the super admin sees nothing on the allowed list');

select throws_ok(
  $$ insert into public.allowed_email_domains (entry) values ('sam.example.com') $$,
  '42501',
  null,
  'Anyone but the super admin cannot add to the allowed list'
);

delete from public.allowed_email_domains where entry = 'insuranceerm.com';

-- As Rosa
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);

select is(public.is_super_admin(), true, 'Rosa is the super admin');

select ok(
  (select count(*) from public.allowed_email_domains where entry = 'insuranceerm.com') = 1,
  'Anyone but the super admin cannot remove from the allowed list'
);

insert into public.allowed_email_domains (entry) values ('jane@example.com');
delete from public.allowed_email_domains where entry = 'insuranceerm.com';

select results_eq(
  $$ select entry from public.allowed_email_domains where entry in ('jane@example.com', 'insuranceerm.com') $$,
  $$ values ('jane@example.com') $$,
  'The super admin adds to and removes from the allowed list'
);

select throws_ok(
  $$ update public.allowed_email_domains set entry = 'other.example.com' where entry = 'jane@example.com' $$,
  '42501',
  null,
  'Entries are added or removed, never changed'
);

-- Back as admin: Sam's account, with something in each part of it, and a source Rosa follows too.
reset role;

insert into public.watch_lists (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c2', 'Sam''s list'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c1', 'Rosa''s list');
insert into public.sources (id, url) values ('00000000-0000-0000-0000-0000000000c5', 'https://example.com/shared');
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c5'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5');
insert into public.articles (id, source_id, url, title) overriding system value values
  (9301, '00000000-0000-0000-0000-0000000000c5', 'https://example.com/shared/1', 'A shared story');
insert into public.saved_stories (watch_list_id, article_id) values ('00000000-0000-0000-0000-0000000000c3', 9301);
insert into public.magazine_connections (user_id, publication_id, cms_username, session_ciphertext) values
  ('00000000-0000-0000-0000-0000000000c2', 4, 'sam', 'locked');
insert into public.publish_log (user_id, publication_id, article_id, action, result, cms_resource_id) values
  ('00000000-0000-0000-0000-0000000000c2', 4, null, 'connect', 'ok', null),
  ('00000000-0000-0000-0000-0000000000c2', 4, 9301, 'post_draft', 'ok', 601);
insert into public.active_days (user_id, day) values ('00000000-0000-0000-0000-0000000000c2', current_date);
insert into public.usage_events (user_id, action, article_id) values ('00000000-0000-0000-0000-0000000000c2', 'share_copy_link', 9301);

-- What the delete-account function asks Supabase to do.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c2';

select is_empty(
  $$ select id from public.profiles where id = '00000000-0000-0000-0000-0000000000c2' $$,
  'Deleting an account deletes its profile'
);

select ok(
  not exists (select 1 from public.watch_lists where user_id = '00000000-0000-0000-0000-0000000000c2')
  and not exists (select 1 from public.saved_stories where watch_list_id = '00000000-0000-0000-0000-0000000000c3'),
  'Deleting an account deletes its watch lists and saved stories'
);

select ok(
  not exists (select 1 from public.magazine_connections where user_id = '00000000-0000-0000-0000-0000000000c2')
  and not exists (select 1 from public.active_days where user_id = '00000000-0000-0000-0000-0000000000c2')
  and not exists (select 1 from public.usage_events where user_id = '00000000-0000-0000-0000-0000000000c2'),
  'Deleting an account deletes its magazine connections and usage'
);

select is(
  (select count(*)::int from public.publish_log where user_id is null and article_id = 9301 and action = 'post_draft'),
  1,
  'Deleting an account keeps the drafts it sent, without the person'
);

select ok(
  exists (select 1 from public.articles where id = 9301)
  and exists (select 1 from public.watch_list_sources where watch_list_id = '00000000-0000-0000-0000-0000000000c4'),
  'A shared source and its stories stay for the other lists'
);

-- As Rosa, who follows the same source
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);

select results_eq(
  $$ select sent_by, sent_by_me from public.story_sends(array[9301::bigint]) $$,
  $$ values ('A former colleague', false) $$,
  'Colleagues still see that a deleted account sent the story'
);

select * from finish();
rollback;
