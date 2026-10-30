-- When the user's last daily digest was done: sent, or skipped because nothing was new.
-- The next digest lists the stories found since then. Written only by the digest sender (secret key):
-- users can't update it, as it isn't in their column grants.
alter table public.profiles
  add column last_digest_at timestamptz;
