-- private.worker_secrets (the agent worker token's hash) is read only by the
-- SECURITY DEFINER check private.assert_worker. RLS with no policies already
-- denied every API role; this makes the intent explicit (and clears the
-- advisor's "RLS enabled, no policy" notice).
create policy "worker_secrets: no API access" on private.worker_secrets
  as restrictive for all to public using (false) with check (false);
