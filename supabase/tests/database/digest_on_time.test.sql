-- Checks that the database starts the digest only with a saved token, and only on its own. Run: npx supabase test db
begin;
select plan(6);

select is(
  (select schedule from cron.job where jobname = 'start-digest' and command = 'select public.start_digest()'),
  '5,20,35,50 * * * *',
  'The database starts the digest at :05, :20, :35 and :50'
);

-- Without a token (the local database): no call to GitHub
create temp table queued_before as select count(*) as n from net.http_request_queue;
select public.start_digest();
select is(
  (select count(*) from net.http_request_queue),
  (select n from queued_before),
  'Without a token, nothing is sent to GitHub'
);

-- With a token: one call to GitHub's "run now" for digest.yml. Rolled back at the end, so it's never sent.
select vault.create_secret('made-up-token', 'github_digest_token');
select public.start_digest();
select is(
  (select count(*) from net.http_request_queue),
  (select n from queued_before) + 1,
  'With a token, one call is queued'
);
select is(
  (select url from net.http_request_queue order by id desc limit 1),
  'https://api.github.com/repos/fieldgibsonmedia/wirescout/actions/workflows/digest.yml/dispatches',
  'The call asks GitHub to run digest.yml'
);

-- Visitors and signed-in users can't start it
set local role anon;
select throws_ok('select public.start_digest()', '42501', null, 'A visitor cannot start the digest');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a8", "role": "authenticated"}', true);
select throws_ok('select public.start_digest()', '42501', null, 'A signed-in user cannot start the digest');

select * from finish();
rollback;
