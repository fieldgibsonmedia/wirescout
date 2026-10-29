-- Source status, written by the scanner after each check and shown under each source in the app.
alter table public.sources
  add column last_checked_at timestamptz,
  -- Stories found on the source in its last check (0 when it couldn't be read).
  add column stories_found integer,
  add column read_from text check (read_from in ('feed', 'page')),
  -- The source's RSS or Atom feed, once the scanner has found one.
  add column feed_url text;

-- Users add a source by its URL only: the status columns are the scanner's.
revoke insert on public.sources from authenticated;
grant insert (url, name) on public.sources to authenticated;
