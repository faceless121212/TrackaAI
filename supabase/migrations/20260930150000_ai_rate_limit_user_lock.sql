-- The per-user AI burst limit (20260930140000) counted runs under the team
-- row lock only, so a user in several teams could slip a few runs past it by
-- calling different teams at once. A transaction-scoped advisory lock per user
-- serializes that user's reservations across teams.

create or replace function public.start_ai_run(p_team uuid, p_feature text, p_model text, p_actor uuid default auth.uid())
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_id uuid;
begin
  perform private.assert_actor(p_actor);
  if not exists (select 1 from public.memberships where team_id = p_team and user_id = p_actor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select plan into v_plan from public.teams where id = p_team for update;
  -- The team lock serializes one team; this serializes one user across teams.
  perform pg_advisory_xact_lock(hashtextextended('start_ai_run:' || p_actor::text, 0));
  if p_feature <> 'agent' and (
    select count(*) from public.ai_usage
      where user_id = p_actor and feature <> 'agent' and created_at > now() - interval '60 seconds'
  ) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001', detail = '60';
  end if;
  v_limit := private.plan_limit(v_plan, 'aiRuns');
  if v_limit is not null then
    select count(*)::int into v_used from public.ai_usage
      where team_id = p_team and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
    if v_used >= v_limit then
      raise exception 'plan_limit_reached' using errcode = 'P0001', detail = 'aiRuns', hint = v_plan;
    end if;
  end if;
  insert into public.ai_usage (team_id, user_id, feature, model) values (p_team, p_actor, p_feature, p_model)
    returning id into v_id;
  return v_id;
end;
$$;
