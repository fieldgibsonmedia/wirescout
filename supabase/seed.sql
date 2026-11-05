-- Made-up sources and articles for the local database only (npx supabase db reset).
-- Add one of these URLs to a watch list to see its articles.

insert into public.sources (id, url, name) values
  ('00000000-0000-0000-0000-00000000005a', 'https://news.example.com/press', 'Example News'),
  ('00000000-0000-0000-0000-00000000005b', 'https://regulator.example.org/updates', 'Example Regulator');

insert into public.articles (source_id, url, title, summary, published_at, first_seen_at) values
  ('00000000-0000-0000-0000-00000000005a', 'https://news.example.com/press/1', 'Insurer posts record first-half results', 'Gross premiums rose 12% on strong property demand.', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000005a', 'https://news.example.com/press/2', 'New chief risk officer appointed', null, now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000005a', 'https://news.example.com/press/3', 'Green bond issuance passes target', 'The programme closed three months early.', now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000005b', 'https://regulator.example.org/updates/1', 'Consultation on climate stress tests opens', 'Responses are due by the end of the quarter.', now() - interval '4 days', now() - interval '4 days'),
  ('00000000-0000-0000-0000-00000000005b', 'https://regulator.example.org/updates/2', 'Updated guidance on solvency reporting', null, null, now() - interval '5 hours');

-- The local dev account, back after every reset: sign in with dev@fieldgibsonmedia.com / wirescout-dev
-- (docs/project.md). Local only: the cloud project never runs this file. Confirmed, super admin, privacy accepted.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000de', 'authenticated', 'authenticated',
  'dev@fieldgibsonmedia.com', extensions.crypt('wirescout-dev', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{"privacy_accepted": "true"}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at) values (
  gen_random_uuid(), '00000000-0000-0000-0000-0000000000de', '00000000-0000-0000-0000-0000000000de',
  '{"sub": "00000000-0000-0000-0000-0000000000de", "email": "dev@fieldgibsonmedia.com", "email_verified": true}',
  'email', now(), now()
);

update public.profiles set full_name = 'Dev Account', is_super_admin = true where id = '00000000-0000-0000-0000-0000000000de';

-- Two more sources: a busy one (120 stories, for counts over 99) and a failing one.
insert into public.sources (id, url, name) values
  ('00000000-0000-0000-0000-00000000de5c', 'https://wire.example.com/latest', 'Example Wire'),
  ('00000000-0000-0000-0000-00000000de5d', 'https://broken.example.net/news', 'Example Broken');

insert into public.articles (source_id, url, title, summary, first_seen_at)
select
  '00000000-0000-0000-0000-00000000de5c',
  'https://wire.example.com/latest/' || n,
  'Market update number ' || n,
  'A made-up wire story for local testing.',
  now() - n * interval '30 minutes'
from generate_series(1, 120) as n;

-- Checked by the scanner: the first three working, the last one finding nothing.
update public.sources set last_checked_at = now(), stories_found = 3, read_from = 'page' where id = '00000000-0000-0000-0000-00000000005a';
update public.sources set last_checked_at = now(), stories_found = 2, read_from = 'page' where id = '00000000-0000-0000-0000-00000000005b';
update public.sources set last_checked_at = now(), stories_found = 50, read_from = 'feed' where id = '00000000-0000-0000-0000-00000000de5c';
update public.sources set last_checked_at = now(), stories_found = 0, problem = 'not_found' where id = '00000000-0000-0000-0000-00000000de5d';

-- "Regulators": 2 new stories and 2 saved. "Wire": 120 new stories (99+) and a failing source.
insert into public.watch_lists (id, user_id, name, last_viewed_at) values
  ('00000000-0000-0000-0000-00000000dea1', '00000000-0000-0000-0000-0000000000de', 'Regulators', now() - interval '36 hours'),
  ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-0000000000de', 'Wire', now() - interval '7 days');

insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-00000000dea1', '00000000-0000-0000-0000-00000000005a'),
  ('00000000-0000-0000-0000-00000000dea1', '00000000-0000-0000-0000-00000000005b'),
  ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000de5c'),
  ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000de5d');

insert into public.saved_stories (watch_list_id, article_id)
select '00000000-0000-0000-0000-00000000dea1', id
from public.articles
where url in ('https://news.example.com/press/1', 'https://regulator.example.org/updates/1');

-- Post to MODX: the local Docker copies of the magazines (docs/modx-staging-test.md), with the draft
-- sections decided in docs/post-to-modx-plan.md. Each site's own port, as the functions run inside Docker,
-- where the .test names don't reach the sites. The cloud project's ids are read from each live site.
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8081', article_parent_id = 77814, article_template_id = 3 where slug = 'environmental-finance';
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8082', article_parent_id = 65468, article_template_id = 8 where slug = 'insuranceerm';
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8083', article_parent_id = 31708, article_template_id = 4 where slug = 'insurance-asset-risk';
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8084', article_parent_id = 19, article_template_id = 3 where slug = 'corporate-disclosures';
