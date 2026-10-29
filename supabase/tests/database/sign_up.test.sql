-- Checks who may sign up and who can see access requests. Run: npx supabase test db
begin;
select plan(13);

-- The hook gets the new user's details from Supabase; this builds that event for an email.
create function pg_temp.sign_up(email text) returns jsonb language sql as $$
  select public.hook_before_user_created(jsonb_build_object('user', jsonb_build_object('email', email)))
$$;

insert into public.allowed_email_domains (entry) values ('jane@example.com');

select is(pg_temp.sign_up('erin@insuranceerm.com'), '{}'::jsonb, 'Someone at an allowed domain can sign up');
select is(pg_temp.sign_up('Erin@InsuranceERM.com'), '{}'::jsonb, 'Capitals in the email don''t matter');
select is(pg_temp.sign_up('jane@example.com'), '{}'::jsonb, 'A single allowed address can sign up');

select is(
  pg_temp.sign_up('john@example.com') -> 'error' ->> 'http_code',
  '403',
  'Anyone else is refused'
);

select is(
  pg_temp.sign_up('erin@insuranceerm.com.example.com') -> 'error' ->> 'http_code',
  '403',
  'A domain that only contains an allowed one is refused'
);

select ok(
  not has_function_privilege('anon', 'public.hook_before_user_created(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.hook_before_user_created(jsonb)', 'execute'),
  'Only Supabase can run the sign-up check'
);

-- As a visitor who isn't signed in
set local role anon;

insert into public.access_requests (name, email, reason)
values ('John Doe', 'john@example.com', 'I write for a partner magazine.');

select pass('A visitor can request access');

select throws_ok(
  $$ insert into public.access_requests (name, email, reason) values ('John Doe', 'JOHN@example.com', 'Again') $$,
  '23505',
  null,
  'One open request per email'
);

select throws_ok(
  $$ insert into public.access_requests (name, email, reason) values ('Jo', 'jo@example.com', repeat('x', 1001)) $$,
  '23514',
  null,
  'A request''s reason is at most 1000 characters'
);

select throws_ok(
  $$ select * from public.access_requests $$,
  '42501',
  null,
  'A visitor cannot read access requests'
);

select throws_ok(
  $$ select * from public.allowed_email_domains $$,
  '42501',
  null,
  'A visitor cannot read the allowed list'
);

-- Back as admin
reset role;

update public.access_requests set handled_at = now() where email = 'john@example.com';
set local role anon;

insert into public.access_requests (name, email, reason)
values ('John Doe', 'john@example.com', 'Asking again after a reply.');

select pass('Once Ken has handled a request, the same email can ask again');

reset role;

-- A user changes their email and confirms it.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000011', 'gail@example.com');
update auth.users set email = 'gail@insuranceerm.com' where id = '00000000-0000-0000-0000-000000000011';

select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-000000000011'),
  'gail@insuranceerm.com',
  'The profile follows a changed login email'
);

select * from finish();
rollback;
