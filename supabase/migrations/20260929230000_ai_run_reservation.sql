-- AI runs are reserved before the model is called, not logged afterwards:
-- start_ai_run() checks this month's runs against the plan and inserts the row
-- in one step, holding the team row lock so parallel requests can't all slip
-- under the limit. finish_ai_run() fills in the tokens once. Members can no
-- longer insert usage directly (that let one member use up the team's runs).

drop policy "ai_usage: members log their own runs" on public.ai_usage;
revoke insert on public.ai_usage from authenticated, anon;

create function public.start_ai_run(p_team uuid, p_feature text, p_model text, p_actor uuid default auth.uid())
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

-- Tokens are written once, by the user who started the run.
create function public.finish_ai_run(p_run uuid, p_input integer, p_output integer, p_actor uuid default auth.uid())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_actor(p_actor);
  update public.ai_usage
    set input_tokens = greatest(p_input, 0), output_tokens = greatest(p_output, 0)
    where id = p_run and user_id = p_actor and input_tokens = 0 and output_tokens = 0;
end;
$$;

revoke all on function public.start_ai_run(uuid, text, text, uuid) from public, anon;
revoke all on function public.finish_ai_run(uuid, integer, integer, uuid) from public, anon;
grant execute on function public.start_ai_run(uuid, text, text, uuid) to authenticated;
grant execute on function public.finish_ai_run(uuid, integer, integer, uuid) to authenticated;
