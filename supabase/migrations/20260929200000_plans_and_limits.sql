-- Plans (M6). Teams start on Free; billing is simulated, so the owner changes
-- the plan through set_team_plan() (a real payment provider would call it from
-- a webhook with the service role instead). Limits mirror PLAN_CATALOG in
-- src/lib/domain/plans.ts (a PGlite test checks they match) and are enforced
-- here as well as in the server actions, so the API can't be used to skip them.

alter table public.teams drop constraint teams_plan_check;
alter table public.teams add constraint teams_plan_check check (plan in ('free', 'lite', 'pro'));
alter table public.teams alter column plan set default 'free';

-- null = unlimited. Members include the owner and live pending invites.
create function private.plan_limit(p_plan text, p_resource text) returns integer
language sql immutable set search_path = '' as $$
  select case p_resource
    when 'members' then case p_plan when 'free' then 1 when 'lite' then 3 end
    when 'workspaces' then case p_plan when 'free' then 1 when 'lite' then 10 end
    when 'aiRuns' then case p_plan when 'free' then 10 when 'lite' then 100 end
  end;
$$;

create function private.team_usage(p_team uuid, out members integer, out pending_invites integer, out workspaces integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.memberships where team_id = p_team),
    (select count(*)::int from public.invites where team_id = p_team and accepted_at is null and expires_at > now()),
    (select count(*)::int from public.workspaces where team_id = p_team);
$$;

create function private.assert_within_plan(p_team uuid, p_resource text, p_used integer) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan text := (select plan from public.teams where id = p_team);
  v_limit integer := private.plan_limit(v_plan, p_resource);
begin
  if v_limit is not null and p_used + 1 > v_limit then
    raise exception 'plan_limit_reached' using errcode = 'P0001', detail = p_resource, hint = v_plan;
  end if;
end;
$$;

create function private.enforce_workspace_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_within_plan(new.team_id, 'workspaces', (private.team_usage(new.team_id)).workspaces);
  return new;
end;
$$;

create function private.enforce_invite_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_usage record := private.team_usage(new.team_id);
begin
  perform private.assert_within_plan(new.team_id, 'members', v_usage.members + v_usage.pending_invites);
  return new;
end;
$$;

-- Joining uses a seat the invite already held, so only members are counted;
-- this catches invites sent before a downgrade. The owner row (create_team)
-- and re-joins are exempt.
create function private.enforce_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'owner'
     or exists (select 1 from public.memberships where team_id = new.team_id and user_id = new.user_id) then
    return new;
  end if;
  perform private.assert_within_plan(new.team_id, 'members', (private.team_usage(new.team_id)).members);
  return new;
end;
$$;

revoke all on function private.plan_limit(text, text) from public, anon;
revoke all on function private.team_usage(uuid) from public, anon, authenticated;
revoke all on function private.assert_within_plan(uuid, text, integer) from public, anon, authenticated;
revoke all on function private.enforce_workspace_limit() from public, anon, authenticated;
revoke all on function private.enforce_invite_limit() from public, anon, authenticated;
revoke all on function private.enforce_member_limit() from public, anon, authenticated;

create trigger workspaces_plan_limit before insert on public.workspaces
  for each row execute function private.enforce_workspace_limit();
create trigger invites_plan_limit before insert on public.invites
  for each row execute function private.enforce_invite_limit();
create trigger memberships_plan_limit before insert on public.memberships
  for each row execute function private.enforce_member_limit();

-- Usage for the billing page, limit checks and invitees about to join.
create function public.team_usage(p_team uuid)
returns table (members integer, pending_invites integer, workspaces integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member(p_team) and not exists (
    select 1 from public.invites i join auth.users u on lower(u.email) = lower(i.email)
    where i.team_id = p_team and u.id = auth.uid() and i.accepted_at is null and i.expires_at > now()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select u.members, u.pending_invites, u.workspaces from private.team_usage(p_team) u;
end;
$$;

-- Simulated checkout: the owner switches plans directly.
create function public.set_team_plan(p_team uuid, p_plan text, p_actor uuid default auth.uid())
returns public.teams
language plpgsql security definer set search_path = '' as $$
declare
  v_team public.teams;
begin
  perform private.assert_actor(p_actor);
  if not exists (select 1 from public.memberships where team_id = p_team and user_id = p_actor and role = 'owner') then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  update public.teams set plan = p_plan where id = p_team returning * into v_team;
  return v_team;
end;
$$;

revoke all on function public.team_usage(uuid) from public, anon;
revoke all on function public.set_team_plan(uuid, text, uuid) from public, anon;
grant execute on function public.team_usage(uuid) to authenticated;
grant execute on function public.set_team_plan(uuid, text, uuid) to authenticated;
