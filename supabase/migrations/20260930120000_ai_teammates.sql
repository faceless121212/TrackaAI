-- AI teammates (M9): team-scoped agents that can be assigned tasks, and the
-- runs that do the work. Runs change state only through the functions below,
-- each checked against the member who requested the run: no one can drive
-- someone else's run or write agent_runs directly. (The requester's own client
-- could call finish_agent_run with its own text; see docs/build-plan.md M9.)

create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  specialty text not null default '' check (char_length(specialty) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index ai_agents_team_name on public.ai_agents (team_id, lower(name));
create index ai_agents_created_by on public.ai_agents (created_by);

alter table public.ai_agents enable row level security;
revoke update on public.ai_agents from authenticated;
grant update (name, specialty) on public.ai_agents to authenticated;
create policy "ai_agents: members read" on public.ai_agents for select to authenticated
  using (private.is_member(team_id));
create policy "ai_agents: managers add" on public.ai_agents for insert to authenticated
  with check (private.is_manager(team_id) and created_by = (select auth.uid()));
create policy "ai_agents: managers edit" on public.ai_agents for update to authenticated
  using (private.is_manager(team_id)) with check (private.is_manager(team_id));
create policy "ai_agents: managers remove" on public.ai_agents for delete to authenticated
  using (private.is_manager(team_id));

alter table public.tasks add constraint tasks_assignee_agent_id_fkey
  foreign key (assignee_agent_id) references public.ai_agents (id) on delete set null;
alter table public.comments add constraint comments_author_agent_id_fkey
  foreign key (author_agent_id) references public.ai_agents (id) on delete set null;
create index tasks_assignee_agent_id on public.tasks (assignee_agent_id);
create index comments_author_agent_id on public.comments (author_agent_id);

-- Agent assignees must belong to the task's team, like member assignees.
create or replace function private.check_task_refs() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_team uuid := private.team_of_board(new.board_id);
begin
  if tg_op = 'INSERT' or new.column_id is distinct from old.column_id then
    if not exists (select 1 from public.columns where id = new.column_id and board_id = new.board_id) then
      raise exception 'column_not_found' using errcode = 'P0002';
    end if;
  end if;
  if new.parent_id is not null and (tg_op = 'INSERT' or new.parent_id is distinct from old.parent_id) then
    if new.parent_id = new.id or private.team_of_task(new.parent_id) is distinct from v_team then
      raise exception 'parent_not_found' using errcode = 'P0002';
    end if;
  end if;
  if new.assignee_user_id is not null
     and (tg_op = 'INSERT' or new.assignee_user_id is distinct from old.assignee_user_id) then
    if not exists (select 1 from public.memberships where team_id = v_team and user_id = new.assignee_user_id) then
      raise exception 'assignee_not_member' using errcode = '23514';
    end if;
  end if;
  if new.assignee_agent_id is not null
     and (tg_op = 'INSERT' or new.assignee_agent_id is distinct from old.assignee_agent_id) then
    if not exists (select 1 from public.ai_agents where id = new.assignee_agent_id and team_id = v_team) then
      raise exception 'assignee_not_member' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  error text check (char_length(error) <= 500),
  comment_id uuid references public.comments (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index agent_runs_task_created on public.agent_runs (task_id, created_at);
create index agent_runs_team_id on public.agent_runs (team_id);
create index agent_runs_agent_id on public.agent_runs (agent_id);
create index agent_runs_requested_by on public.agent_runs (requested_by);
create index agent_runs_comment_id on public.agent_runs (comment_id);
-- One task, one active run.
create unique index agent_runs_one_active on public.agent_runs (task_id) where status in ('queued', 'running');

alter table public.agent_runs enable row level security;
revoke insert, update, delete, truncate on public.agent_runs from authenticated, anon;
create policy "agent_runs: members read" on public.agent_runs for select to authenticated
  using (private.is_member(team_id));

alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('task_writer', 'breakdown', 'copilot', 'agent'));

-- Queues a run. AI teammates are a Pro feature (PLAN_CATALOG.pro.features.aiTeammate).
create function public.start_agent_run(p_task uuid, p_agent uuid, p_actor uuid default auth.uid())
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_team uuid := private.team_of_task(p_task);
  v_id uuid;
begin
  perform private.assert_actor(p_actor);
  if v_team is null or not exists (select 1 from public.memberships where team_id = v_team and user_id = p_actor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ai_agents where id = p_agent and team_id = v_team) then
    raise exception 'agent_not_found' using errcode = 'P0002';
  end if;
  if (select plan from public.teams where id = v_team) <> 'pro' then
    raise exception 'agents_require_pro' using errcode = 'P0001';
  end if;
  insert into public.agent_runs (team_id, task_id, agent_id, requested_by)
    values (v_team, p_task, p_agent, p_actor) returning id into v_id;
  return v_id;
end;
$$;

-- queued → running; false if it isn't the caller's queued run.
create function public.claim_agent_run(p_run uuid, p_actor uuid default auth.uid())
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_actor(p_actor);
  update public.agent_runs set status = 'running', started_at = now()
    where id = p_run and requested_by = p_actor and status = 'queued';
  return found;
end;
$$;

-- running → succeeded, posting the result as the agent. Returns the comment id.
create function public.finish_agent_run(p_run uuid, p_body text, p_actor uuid default auth.uid())
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_run public.agent_runs;
  v_comment uuid;
begin
  perform private.assert_actor(p_actor);
  select * into v_run from public.agent_runs
    where id = p_run and requested_by = p_actor and status = 'running' for update;
  if not found then
    raise exception 'run_not_running' using errcode = 'P0002';
  end if;
  insert into public.comments (task_id, author_agent_id, body)
    values (v_run.task_id, v_run.agent_id, left(p_body, 10000)) returning id into v_comment;
  update public.agent_runs set status = 'succeeded', finished_at = now(), comment_id = v_comment where id = p_run;
  return v_comment;
end;
$$;

-- queued/running → failed, with a short reason for the run history.
create function public.fail_agent_run(p_run uuid, p_error text, p_actor uuid default auth.uid())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_actor(p_actor);
  update public.agent_runs set status = 'failed', finished_at = now(), error = left(p_error, 500)
    where id = p_run and requested_by = p_actor and status in ('queued', 'running');
end;
$$;

revoke all on function public.start_agent_run(uuid, uuid, uuid) from public, anon;
revoke all on function public.claim_agent_run(uuid, uuid) from public, anon;
revoke all on function public.finish_agent_run(uuid, text, uuid) from public, anon;
revoke all on function public.fail_agent_run(uuid, text, uuid) from public, anon;
grant execute on function public.start_agent_run(uuid, uuid, uuid) to authenticated;
grant execute on function public.claim_agent_run(uuid, uuid) to authenticated;
grant execute on function public.finish_agent_run(uuid, text, uuid) to authenticated;
grant execute on function public.fail_agent_run(uuid, text, uuid) to authenticated;

alter publication supabase_realtime add table public.agent_runs;
