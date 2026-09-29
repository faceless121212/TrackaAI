-- AI usage (M7): one row per AI run, for plan limits (runs per calendar month)
-- and cost tracking. Members log their own runs and read their team's; rows
-- are never edited or deleted through the API.

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null check (feature in ('task_writer', 'breakdown')),
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_team_created on public.ai_usage (team_id, created_at);
create index ai_usage_user_id on public.ai_usage (user_id);

alter table public.ai_usage enable row level security;
revoke update, delete, truncate on public.ai_usage from authenticated, anon;

create policy "ai_usage: members read" on public.ai_usage for select to authenticated
  using (private.is_member(team_id));
create policy "ai_usage: members log their own runs" on public.ai_usage for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_member(team_id));
