-- Defense in depth on the API roles, on top of row-level security.
--
-- Supabase grants `anon` and `authenticated` ALL on every table in public by
-- default. RLS already denies every row to `anon` (no policy names it) and
-- scopes `authenticated` to their team, but some privileges bypass RLS or
-- aren't needed at all:
--   * TRUNCATE ignores RLS entirely (PostgREST doesn't expose it, but the
--     grant shouldn't exist);
--   * TRIGGER and REFERENCES aren't used by the app;
--   * signed-out visitors never read tables (sign-in goes through Supabase
--     Auth; everything else needs a session), so `anon` needs no table access.
-- Existing tables are fixed here; default privileges cover future tables
-- created by this role (migrations run as postgres).

revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;
