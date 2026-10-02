-- "Ask AI" (team-wide, read-only chat about the team's issues) is metered
-- like the other AI features: each message reserves one run via start_ai_run.
alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('task_writer', 'breakdown', 'copilot', 'agent', 'ask'));
