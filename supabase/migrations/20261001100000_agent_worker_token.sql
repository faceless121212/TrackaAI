-- AI teammate runs could be finished by the requester's own client: claim,
-- finish and fail only checked `requested_by = auth.uid()`, so a member could
-- post their own text as the teammate on a task assigned to it. These steps
-- now also need the app server's worker token (AGENT_WORKER_SECRET). Only its
-- SHA-256 is stored here, in a table no API role can read, so a browser can't
-- learn or forge it. Starting a run stays a plain member action.
--
-- Set or rotate the token (as the postgres role):
--   insert into private.worker_secrets (name, token_sha256)
--   values ('agent_worker', decode('<sha256 hex of the token>', 'hex'))
--   on conflict (name) do update set token_sha256 = excluded.token_sha256, updated_at = now();

create table private.worker_secrets (
  name text primary key,
  token_sha256 bytea not null check (length(token_sha256) = 32),
  updated_at timestamptz not null default now()
);
alter table private.worker_secrets enable row level security; -- no policies: API roles see nothing
revoke all on private.worker_secrets from public, anon, authenticated;

-- Raises unless p_token is the configured worker token.
create function private.assert_worker(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hash bytea;
begin
  select token_sha256 into v_hash from private.worker_secrets where name = 'agent_worker';
  if v_hash is null then
    raise exception 'worker_not_configured' using errcode = 'P0001';
  end if;
  if p_token is null or sha256(convert_to(p_token, 'UTF8')) <> v_hash then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.assert_worker(text) from public, anon, authenticated;

drop function public.claim_agent_run(uuid, uuid);
drop function public.finish_agent_run(uuid, text, uuid);
drop function public.fail_agent_run(uuid, text, uuid);

-- queued → running; false if it isn't the caller's queued run.
create function public.claim_agent_run(p_run uuid, p_worker_token text, p_actor uuid default auth.uid())
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_actor(p_actor);
  perform private.assert_worker(p_worker_token);
  update public.agent_runs set status = 'running', started_at = now()
    where id = p_run and requested_by = p_actor and status = 'queued';
  return found;
end;
$$;

-- running → succeeded, posting the result as the agent. Returns the comment id.
create function public.finish_agent_run(p_run uuid, p_body text, p_worker_token text, p_actor uuid default auth.uid())
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_run public.agent_runs;
  v_comment uuid;
begin
  perform private.assert_actor(p_actor);
  perform private.assert_worker(p_worker_token);
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
create function public.fail_agent_run(p_run uuid, p_error text, p_worker_token text, p_actor uuid default auth.uid())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_actor(p_actor);
  perform private.assert_worker(p_worker_token);
  update public.agent_runs set status = 'failed', finished_at = now(), error = left(p_error, 500)
    where id = p_run and requested_by = p_actor and status in ('queued', 'running');
end;
$$;

revoke all on function public.claim_agent_run(uuid, text, uuid) from public, anon;
revoke all on function public.finish_agent_run(uuid, text, text, uuid) from public, anon;
revoke all on function public.fail_agent_run(uuid, text, text, uuid) from public, anon;
grant execute on function public.claim_agent_run(uuid, text, uuid) to authenticated;
grant execute on function public.finish_agent_run(uuid, text, text, uuid) to authenticated;
grant execute on function public.fail_agent_run(uuid, text, text, uuid) to authenticated;
