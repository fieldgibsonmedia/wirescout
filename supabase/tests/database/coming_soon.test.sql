-- Checks the "Coming soon..." magazines: the 3 behind Cloudflare start greyed out, Corporate Disclosures
-- doesn't, and the app (a signed-in user) can read the flag. Run: npx supabase test db
begin;
select plan(3);

select is(
  (select array_agg(slug order by slug) from public.publications where coming_soon),
  array['environmental-finance', 'insurance-asset-risk', 'insuranceerm'],
  'The 3 magazines behind Cloudflare are coming soon'
);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'ama@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select is(
  (select coming_soon from public.publications where slug = 'corporate-disclosures'),
  false,
  'A signed-in user sees Corporate Disclosures as ready'
);

select is(
  (select coming_soon from public.publications where slug = 'environmental-finance'),
  true,
  'A signed-in user sees a coming-soon magazine as coming soon'
);

select * from finish();
rollback;
