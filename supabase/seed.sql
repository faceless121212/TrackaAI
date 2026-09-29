-- Development seed: two pre-confirmed accounts and the demo board (mirrors
-- src/server/data/mock/seed.ts). Safe to re-run: it does nothing if the demo
-- account already exists. Development projects only — the password is public.
--
--   demo@trackaai.test / demo-password   owner of "Acme" (Pro) with a populated board
--   mate@trackaai.test / demo-password   no team yet (invite and isolation tests)

do $$
declare
  v_demo uuid;
  v_mate uuid;
  v_team uuid;
  v_workspace uuid;
  v_board uuid;
  v_columns uuid[];
  v_labels jsonb;
  v_email text;
  v_name text;
  v_id uuid;
begin
  if exists (select 1 from auth.users where email = 'demo@trackaai.test') then
    raise notice 'seed: already applied';
    return;
  end if;

  -- Accounts, confirmed so they can sign in with "Confirm email" switched on.
  for v_email, v_name in values ('demo@trackaai.test', 'Demo User'), ('mate@trackaai.test', 'Mate') loop
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt('demo-password', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', v_name), now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    if v_email = 'demo@trackaai.test' then v_demo := v_id; else v_mate := v_id; end if;
  end loop;

  -- Team, workspace and board, through the same functions the app uses.
  select id into v_team from public.create_team(
    'Acme', 'acme',
    '[{"name":"Bug","color":"red"},{"name":"Feature","color":"purple"},{"name":"Improvement","color":"blue"},{"name":"Docs","color":"gray"}]',
    v_demo
  );
  -- The demo team shows every feature; new teams start on Free.
  update public.teams set plan = 'pro' where id = v_team;
  insert into public.workspaces (team_id, name, key_prefix) values (v_team, 'Engineering', 'ENG') returning id into v_workspace;
  select id into v_board from public.create_board(
    v_workspace, 'Engineering', null,
    '[{"name":"Backlog","position":"a0"},{"name":"Todo","position":"a1"},{"name":"In Progress","position":"a2"},{"name":"In Review","position":"a3"},{"name":"Done","position":"a4"}]'
  );
  select array_agg(id order by position) into v_columns from public.columns where board_id = v_board;
  select jsonb_object_agg(name, id) into v_labels from public.labels where team_id = v_team;

  perform public.create_task(v_board, v_columns[1], 'Write onboarding copy', '', 'low', null,
    array[(v_labels ->> 'Docs')::uuid], null, null, 'a0', v_demo);
  perform public.create_task(v_board, v_columns[1], 'Pick an analytics provider', '', 'none', null,
    '{}', null, null, 'a1', v_demo);
  perform public.create_task(v_board, v_columns[2], 'Add password reset', '', 'medium', v_demo,
    array[(v_labels ->> 'Feature')::uuid], null, null, 'a0', v_demo);
  perform public.create_task(v_board, v_columns[3], 'Build the Kanban board',
    E'Drag & drop between columns.\n\n- [x] Columns\n- [ ] Cards', 'high', v_demo,
    array[(v_labels ->> 'Feature')::uuid], null, null, 'a0', v_demo);
  perform public.create_task(v_board, v_columns[4], 'Fix flaky CI', '', 'urgent', null,
    array[(v_labels ->> 'Bug')::uuid], null, null, 'a0', v_demo);

  raise notice 'seed: created demo %, mate %, team %', v_demo, v_mate, v_team;
end;
$$;
