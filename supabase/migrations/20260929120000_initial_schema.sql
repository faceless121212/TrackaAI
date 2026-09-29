-- TrackaAI initial schema (M4). Mirrors the repository contract in
-- src/server/data/types.ts. Every table has RLS: rows are visible only to
-- members of their team, and writes follow src/server/auth/permissions.ts.
-- Multi-row invariants (task numbers, team creation, invite acceptance,
-- ownership transfer) live in functions so they run in one transaction.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  avatar_url text,
  theme text check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  plan text not null default 'lite' check (plan in ('lite', 'pro')),
  created_at timestamptz not null default now()
);

create table public.memberships (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
-- Exactly one owner per team (PRD §3).
create unique index memberships_one_owner on public.memberships (team_id) where role = 'owner';
create index memberships_user_id on public.memberships (user_id);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  key_prefix text not null check (key_prefix ~ '^[A-Z][A-Z0-9]{1,4}$'),
  next_task_number integer not null default 1 check (next_task_number > 0),
  created_at timestamptz not null default now(),
  unique (team_id, key_prefix)
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create index boards_workspace_id on public.boards (workspace_id);

-- Positions are fractional-indexing keys: they must sort by code unit ("C").
create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position text collate "C" not null
);
create index columns_board_id on public.columns (board_id);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  color text not null check (color in ('gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'))
);
create unique index labels_team_name on public.labels (team_id, lower(name));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  -- NO ACTION (not RESTRICT): deleting a board removes its columns and tasks in
  -- one statement; a column with tasks can't be deleted on its own.
  column_id uuid not null references public.columns (id),
  number integer not null check (number > 0),
  key text not null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 20000),
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  assignee_user_id uuid references public.profiles (id) on delete set null,
  assignee_agent_id uuid,
  due_date date,
  position text collate "C" not null,
  parent_id uuid references public.tasks (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assignee_user_id is null or assignee_agent_id is null)
);
create index tasks_board_id on public.tasks (board_id);
create index tasks_column_id on public.tasks (column_id);
create index tasks_assignee_user_id on public.tasks (assignee_user_id);

create table public.task_labels (
  task_id uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);
create index task_labels_label_id on public.task_labels (label_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_user_id uuid references public.profiles (id) on delete set null,
  author_agent_id uuid,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index comments_task_id on public.comments (task_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token text not null unique check (char_length(token) >= 16),
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_team_id on public.invites (team_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every auth user gets a profile; the display name comes from sign-up metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger tasks_touch_updated_at before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER so policies can resolve ownership without
-- recursing through other tables' RLS.
-- ---------------------------------------------------------------------------

create function public.team_role(p_team uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.memberships where team_id = p_team and user_id = auth.uid();
$$;

create function public.is_member(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.team_role(p_team) is not null;
$$;

create function public.is_manager(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.team_role(p_team) in ('owner', 'admin'), false);
$$;

create function public.team_of_workspace(p_workspace uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select team_id from public.workspaces where id = p_workspace;
$$;

create function public.team_of_board(p_board uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select w.team_id from public.boards b join public.workspaces w on w.id = b.workspace_id where b.id = p_board;
$$;

create function public.team_of_task(p_task uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select public.team_of_board(board_id) from public.tasks where id = p_task;
$$;

create function public.team_of_label(p_label uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select team_id from public.labels where id = p_label;
$$;

create function public.shares_team(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships mine
    join public.memberships theirs on theirs.team_id = mine.team_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.labels enable row level security;
alter table public.tasks enable row level security;
alter table public.task_labels enable row level security;
alter table public.comments enable row level security;
alter table public.invites enable row level security;

create policy "profiles: self and teammates read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_team(id));
create policy "profiles: self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Teams are created through create_team().
create policy "teams: members read" on public.teams for select to authenticated
  using (public.is_member(id));
create policy "teams: managers update" on public.teams for update to authenticated
  using (public.is_manager(id)) with check (public.is_manager(id));
create policy "teams: owner deletes" on public.teams for delete to authenticated
  using (public.team_role(id) = 'owner');

-- Memberships are created by create_team()/accept_invite(). The owner row is
-- never edited or removed directly; ownership moves via transfer_ownership().
create policy "memberships: members read" on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_member(team_id));
create policy "memberships: managers change roles" on public.memberships for update to authenticated
  using (role <> 'owner' and public.is_manager(team_id)) with check (role <> 'owner');
create policy "memberships: managers remove, anyone leaves" on public.memberships for delete to authenticated
  using (role <> 'owner' and (public.is_manager(team_id) or user_id = auth.uid()));

create policy "workspaces: members read" on public.workspaces for select to authenticated
  using (public.is_member(team_id));
create policy "workspaces: managers insert" on public.workspaces for insert to authenticated
  with check (public.is_manager(team_id));
create policy "workspaces: managers update" on public.workspaces for update to authenticated
  using (public.is_manager(team_id)) with check (public.is_manager(team_id));
create policy "workspaces: managers delete" on public.workspaces for delete to authenticated
  using (public.is_manager(team_id));

create policy "boards: members read" on public.boards for select to authenticated
  using (public.is_member(public.team_of_workspace(workspace_id)));
create policy "boards: managers insert" on public.boards for insert to authenticated
  with check (public.is_manager(public.team_of_workspace(workspace_id)));
create policy "boards: managers update" on public.boards for update to authenticated
  using (public.is_manager(public.team_of_workspace(workspace_id)))
  with check (public.is_manager(public.team_of_workspace(workspace_id)));
create policy "boards: managers delete" on public.boards for delete to authenticated
  using (public.is_manager(public.team_of_workspace(workspace_id)));

create policy "columns: members read" on public.columns for select to authenticated
  using (public.is_member(public.team_of_board(board_id)));
create policy "columns: managers insert" on public.columns for insert to authenticated
  with check (public.is_manager(public.team_of_board(board_id)));
create policy "columns: managers update" on public.columns for update to authenticated
  using (public.is_manager(public.team_of_board(board_id)))
  with check (public.is_manager(public.team_of_board(board_id)));
create policy "columns: managers delete" on public.columns for delete to authenticated
  using (public.is_manager(public.team_of_board(board_id)));

create policy "labels: members read" on public.labels for select to authenticated
  using (public.is_member(team_id));
create policy "labels: managers insert" on public.labels for insert to authenticated
  with check (public.is_manager(team_id));
create policy "labels: managers update" on public.labels for update to authenticated
  using (public.is_manager(team_id)) with check (public.is_manager(team_id));
create policy "labels: managers delete" on public.labels for delete to authenticated
  using (public.is_manager(team_id));

-- Tasks are created through create_task() (atomic numbering); members edit,
-- move and delete them. A task can't be moved to another team's board.
create policy "tasks: members read" on public.tasks for select to authenticated
  using (public.is_member(public.team_of_board(board_id)));
create policy "tasks: members update" on public.tasks for update to authenticated
  using (public.is_member(public.team_of_board(board_id)))
  with check (public.is_member(public.team_of_board(board_id)));
create policy "tasks: members delete" on public.tasks for delete to authenticated
  using (public.is_member(public.team_of_board(board_id)));

create policy "task_labels: members read" on public.task_labels for select to authenticated
  using (public.is_member(public.team_of_task(task_id)));
create policy "task_labels: members add their team's labels" on public.task_labels for insert to authenticated
  with check (
    public.is_member(public.team_of_task(task_id))
    and public.team_of_label(label_id) = public.team_of_task(task_id)
  );
create policy "task_labels: members remove" on public.task_labels for delete to authenticated
  using (public.is_member(public.team_of_task(task_id)));

create policy "comments: members read" on public.comments for select to authenticated
  using (public.is_member(public.team_of_task(task_id)));
create policy "comments: members write as themselves" on public.comments for insert to authenticated
  with check (author_user_id = auth.uid() and public.is_member(public.team_of_task(task_id)));
create policy "comments: authors and managers delete" on public.comments for delete to authenticated
  using (author_user_id = auth.uid() or public.is_manager(public.team_of_task(task_id)));

-- Invitees never read invites directly: invite_preview()/accept_invite() do.
create policy "invites: managers read" on public.invites for select to authenticated
  using (public.is_manager(team_id));
create policy "invites: managers insert" on public.invites for insert to authenticated
  with check (public.is_manager(team_id) and invited_by = auth.uid());
create policy "invites: managers update" on public.invites for update to authenticated
  using (public.is_manager(team_id)) with check (public.is_manager(team_id));
create policy "invites: managers delete" on public.invites for delete to authenticated
  using (public.is_manager(team_id));

-- ---------------------------------------------------------------------------
-- Functions for multi-row operations. `p_actor` defaults to the caller; the
-- server (service role, no auth.uid()) may act for a given user, a signed-in
-- user only for themselves.
-- ---------------------------------------------------------------------------

create function public.assert_actor(p_actor uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_actor is null or (auth.uid() is not null and p_actor <> auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- Creates the team, makes the actor its owner and seeds labels.
create function public.create_team(p_name text, p_slug text, p_labels jsonb default '[]', p_actor uuid default auth.uid())
returns public.teams
language plpgsql security definer set search_path = '' as $$
declare
  v_team public.teams;
begin
  perform public.assert_actor(p_actor);
  insert into public.teams (name, slug) values (p_name, p_slug) returning * into v_team;
  insert into public.memberships (team_id, user_id, role) values (v_team.id, p_actor, 'owner');
  insert into public.labels (team_id, name, color)
    select v_team.id, label ->> 'name', label ->> 'color' from jsonb_array_elements(p_labels) as label;
  return v_team;
end;
$$;

-- Creates a board with its columns in one transaction. Runs with the caller's
-- rights, so RLS decides who may create boards.
create function public.create_board(p_workspace uuid, p_name text, p_description text, p_columns jsonb)
returns public.boards
language plpgsql set search_path = '' as $$
declare
  v_board public.boards;
begin
  insert into public.boards (workspace_id, name, description)
    values (p_workspace, p_name, p_description) returning * into v_board;
  insert into public.columns (board_id, name, position)
    select v_board.id, col ->> 'name', col ->> 'position' from jsonb_array_elements(p_columns) as col;
  return v_board;
end;
$$;

-- Allocates the workspace's next task number atomically and inserts the task
-- with its labels. The caller computes `p_position` (fractional index).
create function public.create_task(
  p_board uuid,
  p_column uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_assignee_user uuid,
  p_label_ids uuid[],
  p_due_date date,
  p_parent uuid,
  p_position text,
  p_actor uuid default auth.uid()
) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare
  v_team uuid := public.team_of_board(p_board);
  v_workspace public.workspaces;
  v_task public.tasks;
begin
  perform public.assert_actor(p_actor);
  if v_team is null then
    raise exception 'board_not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not public.is_member(v_team) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.columns where id = p_column and board_id = p_board) then
    raise exception 'column_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from unnest(p_label_ids) as l(id) where public.team_of_label(l.id) is distinct from v_team) then
    raise exception 'label_not_in_team' using errcode = '23514';
  end if;

  update public.workspaces w set next_task_number = next_task_number + 1
    from public.boards b
    where b.id = p_board and w.id = b.workspace_id
    returning w.* into v_workspace;

  insert into public.tasks (
    board_id, column_id, number, key, title, description, priority,
    assignee_user_id, due_date, position, parent_id, created_by
  ) values (
    p_board, p_column, v_workspace.next_task_number - 1,
    v_workspace.key_prefix || '-' || (v_workspace.next_task_number - 1),
    p_title, p_description, p_priority, p_assignee_user, p_due_date, p_position, p_parent, p_actor
  ) returning * into v_task;

  insert into public.task_labels (task_id, label_id) select v_task.id, unnest(p_label_ids);
  return v_task;
end;
$$;

-- What an invitee may see before joining: the invite plus team and inviter names.
create function public.invite_preview(p_token text)
returns table (invite jsonb, team_name text, team_slug text, inviter_name text)
language sql stable security definer set search_path = '' as $$
  select to_jsonb(i), t.name, t.slug, p.name
  from public.invites i
  join public.teams t on t.id = i.team_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token;
$$;

create function public.accept_invite(p_token text, p_actor uuid default auth.uid())
returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
  v_email text;
  v_membership public.memberships;
begin
  perform public.assert_actor(p_actor);
  select * into v_invite from public.invites where token = p_token for update;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite_used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  select email into v_email from public.profiles where id = p_actor;
  if v_email is distinct from v_invite.email then
    raise exception 'invite_email_mismatch' using errcode = 'P0001', detail = v_invite.email;
  end if;

  update public.invites set accepted_at = now() where id = v_invite.id;
  insert into public.memberships (team_id, user_id, role)
    values (v_invite.team_id, p_actor, v_invite.role)
    on conflict (team_id, user_id) do nothing;
  select * into v_membership from public.memberships where team_id = v_invite.team_id and user_id = p_actor;
  return v_membership;
end;
$$;

create function public.transfer_ownership(p_team uuid, p_to uuid, p_actor uuid default auth.uid())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_actor(p_actor);
  if not exists (select 1 from public.memberships where team_id = p_team and user_id = p_actor and role = 'owner') then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memberships where team_id = p_team and user_id = p_to) then
    raise exception 'membership_not_found' using errcode = 'P0002';
  end if;
  -- Demote first: the one-owner index is checked per statement.
  update public.memberships set role = 'admin' where team_id = p_team and user_id = p_actor;
  update public.memberships set role = 'owner' where team_id = p_team and user_id = p_to;
end;
$$;

-- Definer functions are for signed-in users and the server only.
revoke execute on function public.create_team(text, text, jsonb, uuid) from public, anon;
revoke execute on function public.create_task(uuid, uuid, text, text, text, uuid, uuid[], date, uuid, text, uuid) from public, anon;
revoke execute on function public.invite_preview(text) from public, anon;
revoke execute on function public.accept_invite(text, uuid) from public, anon;
revoke execute on function public.transfer_ownership(uuid, uuid, uuid) from public, anon;
revoke execute on function public.create_board(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_team(text, text, jsonb, uuid) to authenticated, service_role;
grant execute on function public.create_task(uuid, uuid, text, text, text, uuid, uuid[], date, uuid, text, uuid) to authenticated, service_role;
grant execute on function public.invite_preview(text) to authenticated, service_role;
grant execute on function public.accept_invite(text, uuid) to authenticated, service_role;
grant execute on function public.transfer_ownership(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.create_board(uuid, text, text, jsonb) to authenticated, service_role;

-- Live board updates (M4): other members' changes arrive without a refresh.
alter publication supabase_realtime add table public.tasks, public.columns, public.task_labels;
