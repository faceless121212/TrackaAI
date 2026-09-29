-- The board copilot (M8) is metered like the other AI features.
alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('task_writer', 'breakdown', 'copilot'));
