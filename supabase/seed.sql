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

-- Post to MODX: the local Docker copies of the magazines (docs/modx-staging-test.md), with the draft
-- sections decided in docs/post-to-modx-plan.md. Each site's own port, as the functions run inside Docker,
-- where the .test names don't reach the sites. The cloud project's ids are read from each live site.
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8081', article_parent_id = 77814, article_template_id = 3 where slug = 'environmental-finance';
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8082', article_parent_id = 65468, article_template_id = 8 where slug = 'insuranceerm';
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8083', article_parent_id = 31708, article_template_id = 4 where slug = 'insurance-asset-risk';
update public.publications set cms = 'modx', cms_url = 'http://host.docker.internal:8084', article_parent_id = 19, article_template_id = 3 where slug = 'corporate-disclosures';
