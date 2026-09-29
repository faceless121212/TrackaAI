-- Follow-ups from the Supabase security and performance advisors.

-- 1. RLS helper functions are only needed while evaluating policies, which
--    apply to signed-in users. Signed-out visitors (anon) must not be able to
--    call them through /rest/v1/rpc.
revoke execute on function
  public.team_role(uuid),
  public.is_member(uuid),
  public.is_manager(uuid),
  public.team_of_workspace(uuid),
  public.team_of_board(uuid),
  public.team_of_task(uuid),
  public.team_of_label(uuid),
  public.shares_team(uuid),
  public.assert_actor(uuid),
  public.touch_updated_at()
from public, anon;
grant execute on function
  public.team_role(uuid),
  public.is_member(uuid),
  public.is_manager(uuid),
  public.team_of_workspace(uuid),
  public.team_of_board(uuid),
  public.team_of_task(uuid),
  public.team_of_label(uuid),
  public.shares_team(uuid),
  public.assert_actor(uuid)
to authenticated, service_role;

-- The sign-up trigger fires without an EXECUTE check; nobody calls it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. Evaluate auth.uid() once per statement instead of once per row.
alter policy "profiles: self and teammates read" on public.profiles
  using (id = (select auth.uid()) or public.shares_team(id));
alter policy "profiles: self update" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "memberships: members read" on public.memberships
  using (user_id = (select auth.uid()) or public.is_member(team_id));
alter policy "memberships: managers remove, anyone leaves" on public.memberships
  using (role <> 'owner' and (public.is_manager(team_id) or user_id = (select auth.uid())));
alter policy "comments: members write as themselves" on public.comments
  with check (author_user_id = (select auth.uid()) and public.is_member(public.team_of_task(task_id)));
alter policy "comments: authors and managers delete" on public.comments
  using (author_user_id = (select auth.uid()) or public.is_manager(public.team_of_task(task_id)));
alter policy "invites: managers insert" on public.invites
  with check (public.is_manager(team_id) and invited_by = (select auth.uid()));

-- 3. Cover the remaining foreign keys.
create index comments_author_user_id on public.comments (author_user_id);
create index invites_invited_by on public.invites (invited_by);
create index tasks_created_by on public.tasks (created_by);
create index tasks_parent_id on public.tasks (parent_id);
