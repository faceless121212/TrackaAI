-- Tighten what signed-in users may write directly through the API. RLS policies
-- only decide which rows; column grants decide which fields. Without them a
-- manager could rewrite memberships.team_id (joining someone into another
-- team), set teams.plan, or rewrite task keys, and users could change their
-- profile email to pass accept_invite's email check.

-- Profiles: name, avatar and theme. The email mirrors auth.users.
revoke update on public.profiles from authenticated;
grant update (name, avatar_url, theme) on public.profiles to authenticated;

-- Teams: only the name. The plan is written by billing (service role).
revoke update on public.teams from authenticated;
grant update (name) on public.teams to authenticated;

-- Memberships: only the role, and only as permissions.ts's canManageMember
-- allows: the owner manages admins and members, admins manage members.
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;

drop policy "memberships: managers change roles" on public.memberships;
create policy "memberships: managers change roles" on public.memberships for update to authenticated
  using (
    role <> 'owner'
    and (private.team_role(team_id) = 'owner' or (private.team_role(team_id) = 'admin' and role = 'member'))
  )
  with check (role <> 'owner' and private.is_manager(team_id));

drop policy "memberships: managers remove, anyone leaves" on public.memberships;
create policy "memberships: managers remove, anyone leaves" on public.memberships for delete to authenticated
  using (
    role <> 'owner'
    and (
      user_id = (select auth.uid())
      or private.team_role(team_id) = 'owner'
      or (private.team_role(team_id) = 'admin' and role = 'member')
    )
  );

-- Tasks: the editable fields only. board_id, number, key and created_by are
-- set once by create_task().
revoke update on public.tasks from authenticated;
grant update (title, description, priority, assignee_user_id, assignee_agent_id, due_date, position, column_id, parent_id)
  on public.tasks to authenticated;

-- A task's column must be on its board, its parent in the same team, and its
-- assignee a member of that team. Checked only when those fields change, so a
-- task assigned to someone who has since left stays editable.
create function private.check_task_refs() returns trigger
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
  return new;
end;
$$;
revoke all on function private.check_task_refs() from public, anon, authenticated;

create trigger tasks_check_refs before insert or update on public.tasks
  for each row execute function private.check_task_refs();

-- accept_invite compares against the sign-in email (auth.users), which only
-- Supabase Auth changes, after confirming it.
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
  select email into v_email from auth.users where id = p_actor;
  if lower(v_email) is distinct from lower(v_invite.email) then
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
