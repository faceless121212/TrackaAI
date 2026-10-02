-- Follow-up to 20261002140000:
-- * MAINTAIN (Postgres 17: VACUUM, ANALYZE, REINDEX, LOCK TABLE…) is part of
--   Supabase's default grant to `authenticated`; the app never needs it.
-- * Supabase's defaults also give anon EXECUTE on every new public function and
--   access to new sequences. Drop that; RPCs keep granting `authenticated`
--   explicitly. (PUBLIC's built-in EXECUTE is left alone: the private RLS
--   helpers rely on it, and anon has no USAGE on schema private.)

revoke maintain on all tables in schema public from authenticated;
alter default privileges in schema public revoke maintain on tables from authenticated;

alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;
