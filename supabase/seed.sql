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
