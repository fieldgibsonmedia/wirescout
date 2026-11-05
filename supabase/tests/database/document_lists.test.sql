-- Checks documents lists: one page as two sources, and which PDFs count as new. Run: npx supabase test db
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'bea@example.com');

insert into public.watch_lists (id, user_id, name, kind, last_viewed_at) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', 'Issuers', 'documents', '2026-01-02'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Press', default, '2026-01-02');

-- The same page, followed for its PDFs and for its stories.
insert into public.sources (id, url, kind) values
  ('00000000-0000-0000-0000-0000000000b4', 'https://issuer.example/investors', 'documents'),
  ('00000000-0000-0000-0000-0000000000b5', 'https://issuer.example/investors', default);
insert into public.watch_list_sources (watch_list_id, source_id) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b4'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b5');

insert into public.articles (source_id, url, title, section, document_kind, found_on_first_check, first_seen_at) values
  -- On the page at the first check: not new.
  ('00000000-0000-0000-0000-0000000000b4', 'https://issuer.example/old-report.pdf', 'Green bond report 2024', 'Reporting', 'allocation_report', true, '2026-01-04'),
  -- Added later: new, unless the model says it's something else.
  ('00000000-0000-0000-0000-0000000000b4', 'https://issuer.example/report.pdf', 'Green bond report 2025', 'Reporting', 'allocation_report', false, '2026-01-03'),
  ('00000000-0000-0000-0000-0000000000b4', 'https://issuer.example/q3.pdf', 'Quarterly report', 'Financial reports', 'other', false, '2026-01-03'),
  -- Not labelled yet: shown, so nothing is missed.
  ('00000000-0000-0000-0000-0000000000b4', 'https://issuer.example/ft-121.pdf', 'Loan 121', 'Final terms', null, false, '2026-01-03'),
  ('00000000-0000-0000-0000-0000000000b5', 'https://issuer.example/news/1', 'Issuer prices a new bond', null, null, false, '2026-01-03');

select is(
  (select kind from public.sources where id = '00000000-0000-0000-0000-0000000000b5'),
  'news',
  'A source is a news source unless said otherwise'
);

select throws_ok(
  $$insert into public.sources (url) values ('https://issuer.example/investors')$$,
  '23505',
  null,
  'A page is one news source at most'
);

select throws_ok(
  $$update public.articles set document_kind = 'prospectus' where url = 'https://issuer.example/q3.pdf'$$,
  '23514',
  null,
  'A PDF gets one of the known labels only'
);

-- As Bea
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

select lives_ok(
  $$insert into public.sources (url, kind) values ('https://issuer.example/green-finance', 'documents')$$,
  'A user adds a documents source'
);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000000b2'),
  2,
  'A documents list counts the bond documents added after the first check, and those not labelled yet'
);

select is(
  (select new_count from public.watch_list_new_counts where watch_list_id = '00000000-0000-0000-0000-0000000000b3'),
  1,
  'A news list counts its stories as before'
);

select is(
  (select count(*)::int from public.watch_list_articles where watch_list_id = '00000000-0000-0000-0000-0000000000b2'),
  4,
  'A documents list still shows every PDF'
);

select is(
  (select latest_story_at from public.watch_list_stats where watch_list_id = '00000000-0000-0000-0000-0000000000b2'),
  '2026-01-03'::timestamptz,
  'The dashboard''s latest document leaves out what was on the page at the first check'
);

update public.watch_lists set keywords = '{final terms}' where id = '00000000-0000-0000-0000-0000000000b2';
select is(
  (select title from public.watch_list_articles where watch_list_id = '00000000-0000-0000-0000-0000000000b2'),
  'Loan 121',
  'Keywords also look in the section heading'
);

select * from finish();
rollback;
