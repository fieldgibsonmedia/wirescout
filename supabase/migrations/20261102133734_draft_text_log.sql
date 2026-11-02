-- The draft-text function logs each suggestion it asks Claude Haiku 5.5 for, so it can allow 10 per user
-- per hour (docs/post-to-modx-plan.md). result is ok for a suggestion, error when the fallback was used.
alter table public.publish_log
  drop constraint publish_log_action_check,
  add constraint publish_log_action_check check (action in ('connect', 'disconnect', 'post_draft', 'draft_text'));
