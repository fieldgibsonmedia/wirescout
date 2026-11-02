-- Magazines Wirescout can't reach yet show in the app greyed out, labelled "Coming soon...", instead of
-- being hidden: Environmental Finance, InsuranceERM and Insurance Asset Risk sit behind a Cloudflare bot
-- check that blocks the functions (found 2026-11-02, release step 4). Turning one on later is one update:
--   update public.publications set coming_soon = false where slug = '<slug>';
alter table public.publications
  add column coming_soon boolean not null default false;

update public.publications set coming_soon = true
where slug in ('environmental-finance', 'insuranceerm', 'insurance-asset-risk');
