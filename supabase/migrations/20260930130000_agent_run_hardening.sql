-- Review fixes for AI teammates (M9):
-- * create_task can assign an AI teammate (the create dialog lost it before).
-- * A run needs the task to be assigned to that agent; stale runs (10 min) time
--   out instead of blocking the task; a team has at most 3 active runs and 50
--   runs a day (fair use on Pro).
-- * Adding agents needs Pro; a comment has at most one author.

drop function public.create_task(uuid, uuid, text, text, text, uuid, uuid[], date, uuid, text, uuid);
create function public.create_task(
  p_board uuid,
  p_column uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_assignee_user uuid,
  p_label_ids uuid[],
  p_due_date date,
  p_parent uuid,
  p_position text,
  p_actor uuid default auth.uid(),
  p_assignee_agent uuid default null
) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare
  v_team uuid := private.team_of_board(p_board);
  v_workspace public.workspaces;
  v_task public.tasks;
begin
  perform private.assert_actor(p_actor);
  if v_team is null then
    raise exception 'board_not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not private.is_member(v_team) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.columns where id = p_column and board_id = p_board) then
    raise exception 'column_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from unnest(p_label_ids) as l(id) where private.team_of_label(l.id) is distinct from v_team) then
    raise exception 'label_not_in_team' using errcode = '23514';
  end if;

  update public.workspaces w set next_task_number = next_task_number + 1
    from public.boards b
    where b.id = p_board and w.id = b.workspace_id
    returning w.* into v_workspace;

  -- The task-refs trigger checks the assignee (member or agent) is in the team.
  insert into public.tasks (
    board_id, column_id, number, key, title, description, priority,
    assignee_user_id, assignee_agent_id, due_date, position, parent_id, created_by
  ) values (
    p_board, p_column, v_workspace.next_task_number - 1,
    v_workspace.key_prefix || '-' || (v_workspace.next_task_number - 1),
    p_title, p_description, p_priority, p_assignee_user, p_assignee_agent, p_due_date, p_position, p_parent, p_actor
  ) returning * into v_task;

  insert into public.task_labels (task_id, label_id) select v_task.id, unnest(p_label_ids);
  return v_task;
end;
$$;
revoke execute on function public.create_task(uuid, uuid, text, text, text, uuid, uuid[], date, uuid, text, uuid, uuid) from public, anon;
grant execute on function public.create_task(uuid, uuid, text, text, text, uuid, uuid[], date, uuid, text, uuid, uuid) to authenticated, service_role;

create or replace function public.start_agent_run(p_task uuid, p_agent uuid, p_actor uuid default auth.uid())
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
  -- Locks the team row: the checks below then see every concurrent start.
  if (select plan from public.teams where id = v_team for update) <> 'pro' then
    raise exception 'agents_require_pro' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.tasks where id = p_task and assignee_agent_id = p_agent) then
    raise exception 'agent_not_assigned' using errcode = 'P0001';
  end if;

  -- A run that never finished (server stopped, run abandoned) times out.
  update public.agent_runs set status = 'failed', finished_at = now(), error = 'Timed out'
    where team_id = v_team and status in ('queued', 'running') and created_at < now() - interval '10 minutes';

  if (select count(*) from public.agent_runs where team_id = v_team and status in ('queued', 'running')) >= 3 then
    raise exception 'agent_busy' using errcode = 'P0001';
  end if;
  if (select count(*) from public.agent_runs where team_id = v_team and created_at > now() - interval '1 day') >= 50 then
    raise exception 'agent_daily_limit' using errcode = 'P0001';
  end if;

  insert into public.agent_runs (team_id, task_id, agent_id, requested_by)
    values (v_team, p_task, p_agent, p_actor) returning id into v_id;
  return v_id;
end;
$$;

drop policy "ai_agents: managers add" on public.ai_agents;
create policy "ai_agents: managers add on Pro" on public.ai_agents for insert to authenticated
  with check (
    private.is_manager(team_id)
    and created_by = (select auth.uid())
    and exists (select 1 from public.teams where id = team_id and plan = 'pro')
  );

alter table public.comments add constraint comments_one_author
  check (num_nonnulls(author_user_id, author_agent_id) <= 1);
