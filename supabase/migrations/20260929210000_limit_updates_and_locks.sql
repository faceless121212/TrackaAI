-- Review fixes for plan limits:
-- * Resending an expired invite brings its seat back, so updates that make an
--   invite live again are checked too. Managers may only change an invite's
--   token and expiry (not its team, email or role).
-- * Two concurrent inserts could both see "one below the limit". Each check
--   now locks the team row first, so checks for one team run one at a time.

revoke update on public.invites from authenticated;
grant update (token, expires_at) on public.invites to authenticated;

create or replace function private.enforce_workspace_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.teams where id = new.team_id for update;
  perform private.assert_within_plan(new.team_id, 'workspaces', (private.team_usage(new.team_id)).workspaces);
  return new;
end;
$$;

create or replace function private.enforce_invite_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_usage record;
begin
  -- Only an invite that becomes live takes a seat: a new one, or an expired
  -- or accepted one being revived. Refreshing a live invite changes nothing.
  if new.accepted_at is not null or new.expires_at <= now() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.accepted_at is null and old.expires_at > now() and old.team_id = new.team_id then
    return new;
  end if;
  perform 1 from public.teams where id = new.team_id for update;
  v_usage := private.team_usage(new.team_id);
  perform private.assert_within_plan(new.team_id, 'members', v_usage.members + v_usage.pending_invites);
  return new;
end;
$$;

create or replace function private.enforce_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'owner'
     or exists (select 1 from public.memberships where team_id = new.team_id and user_id = new.user_id) then
    return new;
  end if;
  perform 1 from public.teams where id = new.team_id for update;
  perform private.assert_within_plan(new.team_id, 'members', (private.team_usage(new.team_id)).members);
  return new;
end;
$$;

drop trigger invites_plan_limit on public.invites;
create trigger invites_plan_limit before insert or update of expires_at, accepted_at, team_id on public.invites
  for each row execute function private.enforce_invite_limit();
