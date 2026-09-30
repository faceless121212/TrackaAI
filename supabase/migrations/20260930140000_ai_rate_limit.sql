-- A per-user burst limit on interactive AI runs, on top of the plan's monthly
-- quota: at most 20 runs in any rolling minute (AI_RATE_LIMIT in
-- src/lib/domain/ai.ts). Pro teams have no monthly cap, so without this one
-- scripted client could spend the team's money as fast as the model answers.
-- AI teammate runs are exempt: start_agent_run already caps them.

create index ai_usage_user_created on public.ai_usage (user_id, created_at);
drop index public.ai_usage_user_id; -- covered by the new index (user_id first)

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
