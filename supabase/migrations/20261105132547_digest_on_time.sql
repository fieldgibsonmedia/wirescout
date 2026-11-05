-- The database starts the daily digest every 15 minutes (docs/mvp-plan.md, "Daily digest on time").
-- GitHub starts its own scheduled runs when it has capacity, often an hour late. A "run now" call starts within seconds.
-- digest.yml keeps its own schedule as a backup: if both start, it runs one at a time and last_digest_at stops a
-- second digest the same day.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Asks GitHub to run digest.yml now, with the token saved in Vault as github_digest_token (Ken saves it in the cloud
-- project only). No token, as in the local database: it does nothing. GitHub answers 204 when the run starts; the answer
-- shows in net._http_response.
create function public.start_digest()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_digest_token';
  if token is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.github.com/repos/fieldgibsonmedia/wirescout/actions/workflows/digest.yml/dispatches',
    body := '{"ref": "main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'wirescout',
      'Content-Type', 'application/json'
    )
  );
end;
$$;

revoke execute on function public.start_digest() from public, anon, authenticated;

-- Same times as digest.yml.
select cron.schedule('start-digest', '5,20,35,50 * * * *', 'select public.start_digest()');
