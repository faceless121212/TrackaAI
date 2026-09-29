-- RLS helpers don't belong in the API: move them to a schema PostgREST never
-- exposes. Policies reference functions by OID, so they keep working; function
-- bodies reference them by name, so those are rewritten below.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.team_role(uuid) set schema private;
alter function public.is_member(uuid) set schema private;
alter function public.is_manager(uuid) set schema private;
alter function public.team_of_workspace(uuid) set schema private;
alter function public.team_of_board(uuid) set schema private;
alter function public.team_of_task(uuid) set schema private;
alter function public.team_of_label(uuid) set schema private;
alter function public.shares_team(uuid) set schema private;
alter function public.assert_actor(uuid) set schema private;

-- Helpers that call other helpers.
create or replace function private.is_member(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.team_role(p_team) is not null;
$$;

create or replace function private.is_manager(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.team_role(p_team) in ('owner', 'admin'), false);
$$;

create or replace function private.team_of_task(p_task uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select private.team_of_board(board_id) from public.tasks where id = p_task;
$$;

-- API functions that call helpers.
create or replace function public.create_team(p_name text, p_slug text, p_labels jsonb default '[]', p_actor uuid default auth.uid())
returns public.teams
language plpgsql security definer set search_path = '' as $$
declare
  v_team public.teams;
begin
  perform private.assert_actor(p_actor);
  insert into public.teams (name, slug) values (p_name, p_slug) returning * into v_team;
  insert into public.memberships (team_id, user_id, role) values (v_team.id, p_actor, 'owner');
  insert into public.labels (team_id, name, color)
    select v_team.id, label ->> 'name', label ->> 'color' from jsonb_array_elements(p_labels) as label;
  return v_team;
end;
$$;

create or replace function public.create_task(
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
  p_actor uuid default auth.uid()
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

  insert into public.tasks (
    board_id, column_id, number, key, title, description, priority,
    assignee_user_id, due_date, position, parent_id, created_by
  ) values (
    p_board, p_column, v_workspace.next_task_number - 1,
    v_workspace.key_prefix || '-' || (v_workspace.next_task_number - 1),
    p_title, p_description, p_priority, p_assignee_user, p_due_date, p_position, p_parent, p_actor
  ) returning * into v_task;

  insert into public.task_labels (task_id, label_id) select v_task.id, unnest(p_label_ids);
  return v_task;
end;
$$;

create or replace function public.accept_invite(p_token text, p_actor uuid default auth.uid())
returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
  v_email text;
  v_membership public.memberships;
begin
  perform private.assert_actor(p_actor);
  select * into v_invite from public.invites where token = p_token for update;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite_used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  select email into v_email from public.profiles where id = p_actor;
  if v_email is distinct from v_invite.email then
    raise exception 'invite_email_mismatch' using errcode = 'P0001', detail = v_invite.email;
  end if;

  update public.invites set accepted_at = now() where id = v_invite.id;
  insert into public.memberships (team_id, user_id, role)
    values (v_invite.team_id, p_actor, v_invite.role)
    on conflict (team_id, user_id) do nothing;
  select * into v_membership from public.memberships where team_id = v_invite.team_id and user_id = p_actor;
  return v_membership;
end;
$$;

create or replace function public.transfer_ownership(p_team uuid, p_to uuid, p_actor uuid default auth.uid())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_actor(p_actor);
  if not exists (select 1 from public.memberships where team_id = p_team and user_id = p_actor and role = 'owner') then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memberships where team_id = p_team and user_id = p_to) then
    raise exception 'membership_not_found' using errcode = 'P0002';
  end if;
  -- Demote first: the one-owner index is checked per statement.
  update public.memberships set role = 'admin' where team_id = p_team and user_id = p_actor;
  update public.memberships set role = 'owner' where team_id = p_team and user_id = p_to;
end;
$$;
