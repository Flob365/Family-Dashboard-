begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(73);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_household'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'household_name text, creator_display_name text, creator_owner text'
      and not p.prosecdef
      and exists (
        select 1
        from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ),
  'the exposed create-household RPC has the stable SECURITY INVOKER signature'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'accept_household_invitation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'invitation_token uuid, member_display_name text'
      and not p.prosecdef
      and exists (
        select 1
        from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ),
  'the exposed accept-invitation RPC has the stable SECURITY INVOKER signature'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'create_household'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'household_name text, creator_display_name text, creator_owner text'
      and p.prosecdef
      and exists (
        select 1
        from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ),
  'the private create-household implementation is fixed-path SECURITY DEFINER'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'accept_household_invitation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'invitation_token uuid, member_display_name text'
      and p.prosecdef
      and exists (
        select 1
        from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ),
  'the private accept-invitation implementation is fixed-path SECURITY DEFINER'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_household'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'household_name text, creator_display_name text, creator_owner text'
      and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from pg_catalog.aclexplode(p.proacl) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
  ),
  'only authenticated can execute the exposed create-household RPC'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'accept_household_invitation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'invitation_token uuid, member_display_name text'
      and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from pg_catalog.aclexplode(p.proacl) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
  ),
  'only authenticated can execute the exposed accept-invitation RPC'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'create_household'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'household_name text, creator_display_name text, creator_owner text'
      and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from pg_catalog.aclexplode(p.proacl) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
  ),
  'the private create-household implementation is not PUBLIC or anon executable'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'accept_household_invitation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'invitation_token uuid, member_display_name text'
      and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from pg_catalog.aclexplode(p.proacl) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
  ),
  'the private accept-invitation implementation is not PUBLIC or anon executable'
);

select extensions.ok(
  not exists (
    select 1
    from (
      values
        ('households', true),
        ('household_members', false),
        ('events', true),
        ('shopping_items', true),
        ('tasks', true),
        ('child_items', true),
        ('reminders', true)
    ) expected(table_name, can_write)
    where not pg_catalog.has_table_privilege(
      'authenticated',
      'public.' || expected.table_name,
      'SELECT'
    )
      or pg_catalog.has_table_privilege(
        'authenticated',
        'public.' || expected.table_name,
        'INSERT'
      ) <> expected.can_write
      or pg_catalog.has_table_privilege(
        'authenticated',
        'public.' || expected.table_name,
        'UPDATE'
      ) <> expected.can_write
      or pg_catalog.has_table_privilege(
        'authenticated',
        'public.' || expected.table_name,
        'DELETE'
      ) <> expected.can_write
      or pg_catalog.has_table_privilege(
        'authenticated',
        'public.' || expected.table_name,
        'TRUNCATE'
      )
      or pg_catalog.has_table_privilege(
        'authenticated',
        'public.' || expected.table_name,
        'REFERENCES'
      )
      or pg_catalog.has_table_privilege(
        'authenticated',
        'public.' || expected.table_name,
        'TRIGGER'
      )
  ),
  'authenticated has the exact intended public-table privilege matrix'
);

select extensions.ok(
  not exists (
    select 1
    from unnest(
      array[
        'households',
        'household_members',
        'events',
        'shopping_items',
        'tasks',
        'child_items',
        'reminders'
      ]
    ) as tables(table_name)
    where pg_catalog.has_table_privilege(
      'anon',
      'public.' || tables.table_name,
      'SELECT'
    )
      or pg_catalog.has_table_privilege(
        'anon',
        'public.' || tables.table_name,
        'INSERT'
      )
      or pg_catalog.has_table_privilege(
        'anon',
        'public.' || tables.table_name,
        'UPDATE'
      )
      or pg_catalog.has_table_privilege(
        'anon',
        'public.' || tables.table_name,
        'DELETE'
      )
      or pg_catalog.has_table_privilege(
        'anon',
        'public.' || tables.table_name,
        'TRUNCATE'
      )
      or pg_catalog.has_table_privilege(
        'anon',
        'public.' || tables.table_name,
        'REFERENCES'
      )
      or pg_catalog.has_table_privilege(
        'anon',
        'public.' || tables.table_name,
        'TRIGGER'
    )
  ),
  'anon has no privilege on any household data table'
);

select extensions.ok(
  (
    select count(*) = 8 and bool_and(c.relrowsecurity)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where (n.nspname, c.relname) in (
      ('public', 'households'),
      ('public', 'household_members'),
      ('public', 'events'),
      ('public', 'shopping_items'),
      ('public', 'tasks'),
      ('public', 'child_items'),
      ('public', 'reminders'),
      ('private', 'household_invitations')
    )
  ),
  'RLS is enabled on every public and private application table'
);

select extensions.ok(
  (
    with expected(table_name, policy_command) as (
      values
        ('households', 'r'),
        ('households', 'a'),
        ('households', 'w'),
        ('households', 'd'),
        ('household_members', 'r'),
        ('events', 'r'),
        ('events', 'a'),
        ('events', 'w'),
        ('events', 'd'),
        ('shopping_items', 'r'),
        ('shopping_items', 'a'),
        ('shopping_items', 'w'),
        ('shopping_items', 'd'),
        ('tasks', 'r'),
        ('tasks', 'a'),
        ('tasks', 'w'),
        ('tasks', 'd'),
        ('child_items', 'r'),
        ('child_items', 'a'),
        ('child_items', 'w'),
        ('child_items', 'd'),
        ('reminders', 'r'),
        ('reminders', 'a'),
        ('reminders', 'w'),
        ('reminders', 'd')
    ),
    actual(table_name, policy_command) as (
      select c.relname::text, p.polcmd::text
      from pg_catalog.pg_policy p
      join pg_catalog.pg_class c on c.oid = p.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'households',
          'household_members',
          'events',
          'shopping_items',
          'tasks',
          'child_items',
          'reminders'
        )
    )
    select not exists (
      (select * from expected except select * from actual)
      union all
      (select * from actual except select * from expected)
    )
  ),
  'the exact per-command household RLS policy matrix is present'
);

select extensions.ok(
  (
    with expected(table_name) as (
      values ('events'), ('shopping_items'), ('tasks'), ('child_items')
    ),
    actual(table_name) as (
      select pt.tablename::text
      from pg_catalog.pg_publication_tables pt
      where pt.pubname = 'supabase_realtime'
        and pt.schemaname = 'public'
    )
    select not exists (
      select * from expected
      except
      select * from actual
    )
  ),
  'the four realtime household tables belong to supabase_realtime'
);

-- Fixed UUIDs make policy failures easy to reproduce and diagnose.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'member-a@example.test'),
  ('20000000-0000-4000-8000-000000000002', 'member-b@example.test');

insert into public.households (id, name, created_by)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    'Household A',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'Household B',
    '20000000-0000-4000-8000-000000000002'
  );

insert into public.household_members (
  id,
  household_id,
  user_id,
  display_name,
  owner,
  role,
  created_by
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Member A',
    'florian',
    'owner',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Member B',
    'partner',
    'owner',
    '20000000-0000-4000-8000-000000000002'
  );

insert into public.events (
  id,
  household_id,
  title,
  starts_at,
  category,
  owner,
  created_by
)
values
  (
    'ae000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'A event',
    '2026-08-13T08:00:00Z',
    'family',
    'family',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    'be000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    'B event',
    '2026-08-13T09:00:00Z',
    'family',
    'family',
    '20000000-0000-4000-8000-000000000002'
  );

insert into public.shopping_items (id, household_id, name, aisle, created_by)
values (
  'b5000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'B milk',
  'fresh',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.tasks (id, household_id, title, owner, priority, created_by)
values (
  'b7000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'B bins',
  'partner',
  'normal',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.child_items (
  id,
  household_id,
  kind,
  space,
  title,
  owner,
  status,
  linked_event_id,
  created_by
)
values (
  'bc000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'event',
  'nursery',
  'B nursery event',
  'partner',
  'pending',
  'be000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.reminders (
  id,
  household_id,
  event_id,
  remind_at,
  status,
  created_by
)
values (
  'bd000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'be000000-0000-4000-8000-000000000002',
  '2026-08-13T08:45:00Z',
  'pending',
  '20000000-0000-4000-8000-000000000002'
);

insert into private.household_invitations (
  token,
  household_id,
  invited_email,
  invited_owner,
  invited_by,
  expires_at
)
values (
  'ab000000-0000-4000-8000-000000000012',
  'a0000000-0000-4000-8000-000000000001',
  'member-b@example.test',
  'partner',
  '10000000-0000-4000-8000-000000000001',
  now() + interval '1 day'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"10000000-0000-4000-8000-000000000001","email":"member-a@example.test","role":"authenticated"}';

select extensions.results_eq(
  $$select name from public.households order by name$$,
  array['Household A'::text],
  'member A reads only household A'
);

select extensions.results_eq(
  $$select display_name from public.household_members order by display_name$$,
  array['Member A'::text],
  'member A reads only their own membership row'
);

select extensions.results_eq(
  $$select title from public.events order by title$$,
  array['A event'::text],
  'member A reads household A events'
);

select extensions.is_empty(
  $$select id from public.events where household_id = 'b0000000-0000-4000-8000-000000000002'$$,
  'member A receives zero household B event rows'
);

select extensions.lives_ok(
  $$
    insert into public.events (
      id, household_id, title, starts_at, category, owner, created_by
    ) values (
      'ae000000-0000-4000-8000-000000000003',
      'a0000000-0000-4000-8000-000000000001',
      'A event to edit',
      '2026-08-13T10:00:00Z',
      'personal',
      'florian',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'member A inserts a household A event'
);

select extensions.results_eq(
  $$select title from public.events where id = 'ae000000-0000-4000-8000-000000000003'$$,
  array['A event to edit'::text],
  'member A reads the inserted event'
);

select extensions.results_eq(
  $$
    update public.events
    set title = 'A event updated'
    where id = 'ae000000-0000-4000-8000-000000000003'
    returning title
  $$,
  array['A event updated'::text],
  'member A updates a household A event'
);

select extensions.results_eq(
  $$
    delete from public.events
    where id = 'ae000000-0000-4000-8000-000000000003'
    returning id
  $$,
  array['ae000000-0000-4000-8000-000000000003'::uuid],
  'member A deletes a household A event'
);

select extensions.is_empty(
  $$select id from public.events where id = 'ae000000-0000-4000-8000-000000000003'$$,
  'the deleted event no longer exists for member A'
);

select extensions.throws_ok(
  $$
    insert into public.events (
      household_id, title, starts_at, category, owner, created_by
    ) values (
      'b0000000-0000-4000-8000-000000000002',
      'Cross-household insert',
      '2026-08-13T11:00:00Z',
      'personal',
      'florian',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'member A cannot insert into household B'
);

select extensions.throws_ok(
  $$
    update public.events
    set household_id = 'b0000000-0000-4000-8000-000000000002'
    where id = 'ae000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'member A cannot move a household A event into household B'
);

select extensions.is_empty(
  $$
    update public.events
    set title = 'Hacked B event'
    where id = 'be000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A updates zero household B rows'
);

select extensions.is_empty(
  $$
    delete from public.events
    where id = 'be000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A deletes zero household B rows'
);

select extensions.lives_ok(
  $$
    insert into public.shopping_items (
      id, household_id, name, aisle, created_by
    ) values (
      'a5000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      'Milk',
      'fresh',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'member A inserts a household A shopping item'
);

select extensions.results_eq(
  $$
    update public.shopping_items
    set checked = true, checked_at = '2026-08-13T12:00:00Z'
    where id = 'a5000000-0000-4000-8000-000000000001'
    returning checked
  $$,
  array[true],
  'member A updates a household A shopping item'
);

select extensions.results_eq(
  $$
    delete from public.shopping_items
    where id = 'a5000000-0000-4000-8000-000000000001'
    returning id
  $$,
  array['a5000000-0000-4000-8000-000000000001'::uuid],
  'member A deletes a household A shopping item'
);

select extensions.lives_ok(
  $$
    insert into public.tasks (
      id, household_id, title, owner, priority, created_by
    ) values (
      'a7000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      'Bins',
      'florian',
      'normal',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'member A inserts a household A task'
);

select extensions.results_eq(
  $$
    update public.tasks
    set completed_at = '2026-08-13T13:00:00Z'
    where id = 'a7000000-0000-4000-8000-000000000001'
    returning title
  $$,
  array['Bins'::text],
  'member A updates a household A task'
);

select extensions.results_eq(
  $$
    delete from public.tasks
    where id = 'a7000000-0000-4000-8000-000000000001'
    returning id
  $$,
  array['a7000000-0000-4000-8000-000000000001'::uuid],
  'member A deletes a household A task'
);

select extensions.lives_ok(
  $$
    insert into public.child_items (
      id,
      household_id,
      kind,
      space,
      title,
      owner,
      status,
      linked_event_id,
      created_by
    ) values (
      'ac000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      'event',
      'school',
      'School gate',
      'florian',
      'pending',
      'ae000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'member A inserts a child item linked to a household A event'
);

select extensions.throws_ok(
  $$
    insert into public.child_items (
      household_id,
      kind,
      space,
      title,
      owner,
      status,
      linked_event_id,
      created_by
    ) values (
      'a0000000-0000-4000-8000-000000000001',
      'event',
      'school',
      'Cross-household link',
      'florian',
      'pending',
      'be000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23503',
  null,
  'a child item cannot link to an event in another household'
);

select extensions.results_eq(
  $$
    update public.child_items
    set status = 'completed'
    where id = 'ac000000-0000-4000-8000-000000000001'
    returning status
  $$,
  array['completed'::text],
  'member A updates a household A child item'
);

select extensions.results_eq(
  $$
    delete from public.child_items
    where id = 'ac000000-0000-4000-8000-000000000001'
    returning id
  $$,
  array['ac000000-0000-4000-8000-000000000001'::uuid],
  'member A deletes a household A child item'
);

select extensions.lives_ok(
  $$
    insert into public.reminders (
      id,
      household_id,
      event_id,
      remind_at,
      status,
      created_by
    ) values (
      'ad000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      'ae000000-0000-4000-8000-000000000001',
      '2026-08-13T07:45:00Z',
      'pending',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'member A inserts a household A reminder'
);

select extensions.results_eq(
  $$
    update public.reminders
    set status = 'sent', sent_at = '2026-08-13T07:45:01Z'
    where id = 'ad000000-0000-4000-8000-000000000001'
    returning status
  $$,
  array['sent'::text],
  'member A updates a household A reminder'
);

select extensions.results_eq(
  $$
    delete from public.reminders
    where id = 'ad000000-0000-4000-8000-000000000001'
    returning id
  $$,
  array['ad000000-0000-4000-8000-000000000001'::uuid],
  'member A deletes a household A reminder'
);

select extensions.is_empty(
  $$select id from public.shopping_items where household_id = 'b0000000-0000-4000-8000-000000000002'$$,
  'member A receives zero household B shopping-item rows'
);

select extensions.throws_ok(
  $$
    insert into public.shopping_items (household_id, name, aisle, created_by)
    values (
      'b0000000-0000-4000-8000-000000000002',
      'Cross-household shopping item',
      'other',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'member A cannot insert a household B shopping item'
);

select extensions.is_empty(
  $$
    update public.shopping_items
    set name = 'Hacked B milk'
    where id = 'b5000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A updates zero household B shopping-item rows'
);

select extensions.is_empty(
  $$
    delete from public.shopping_items
    where id = 'b5000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A deletes zero household B shopping-item rows'
);

select extensions.is_empty(
  $$select id from public.tasks where household_id = 'b0000000-0000-4000-8000-000000000002'$$,
  'member A receives zero household B task rows'
);

select extensions.throws_ok(
  $$
    insert into public.tasks (household_id, title, owner, priority, created_by)
    values (
      'b0000000-0000-4000-8000-000000000002',
      'Cross-household task',
      'florian',
      'normal',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'member A cannot insert a household B task'
);

select extensions.is_empty(
  $$
    update public.tasks
    set title = 'Hacked B bins'
    where id = 'b7000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A updates zero household B task rows'
);

select extensions.is_empty(
  $$
    delete from public.tasks
    where id = 'b7000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A deletes zero household B task rows'
);

select extensions.is_empty(
  $$select id from public.child_items where household_id = 'b0000000-0000-4000-8000-000000000002'$$,
  'member A receives zero household B child-item rows'
);

select extensions.throws_ok(
  $$
    insert into public.child_items (
      household_id, kind, space, title, owner, status, linked_event_id, created_by
    ) values (
      'b0000000-0000-4000-8000-000000000002',
      'event',
      'nursery',
      'Cross-household child item',
      'florian',
      'pending',
      'be000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'member A cannot insert a household B child item'
);

select extensions.is_empty(
  $$
    update public.child_items
    set title = 'Hacked B child item'
    where id = 'bc000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A updates zero household B child-item rows'
);

select extensions.is_empty(
  $$
    delete from public.child_items
    where id = 'bc000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A deletes zero household B child-item rows'
);

select extensions.is_empty(
  $$select id from public.reminders where household_id = 'b0000000-0000-4000-8000-000000000002'$$,
  'member A receives zero household B reminder rows'
);

select extensions.throws_ok(
  $$
    insert into public.reminders (
      household_id, event_id, remind_at, status, created_by
    ) values (
      'b0000000-0000-4000-8000-000000000002',
      'be000000-0000-4000-8000-000000000002',
      '2026-08-13T08:30:00Z',
      'pending',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'member A cannot insert a household B reminder'
);

select extensions.is_empty(
  $$
    update public.reminders
    set status = 'dismissed'
    where id = 'bd000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A updates zero household B reminder rows'
);

select extensions.is_empty(
  $$
    delete from public.reminders
    where id = 'bd000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'member A deletes zero household B reminder rows'
);

select extensions.throws_ok(
  $$
    insert into public.household_members (
      household_id, user_id, display_name, owner, role, created_by
    ) values (
      'b0000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      'Intruder',
      'florian',
      'owner',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'member A cannot add themselves to household B'
);

select extensions.throws_ok(
  $$
    update public.household_members
    set role = 'owner'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'a member cannot change a membership role directly'
);

set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{}';

select extensions.results_eq(
  $$select count(*) from public.events$$,
  array[0::bigint],
  'an authenticated role without a user id receives zero event rows'
);

select extensions.throws_ok(
  $$
    insert into public.events (
      household_id, title, starts_at, category, owner, created_by
    ) values (
      'a0000000-0000-4000-8000-000000000001',
      'No user id',
      '2026-08-13T14:00:00Z',
      'personal',
      'florian',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'an authenticated role without a user id cannot insert'
);

reset role;
set local role anon;

select extensions.throws_ok(
  $$select count(*) from public.events$$,
  '42501',
  null,
  'anon is denied at the grant layer before row access'
);

select extensions.throws_ok(
  $$
    insert into public.events (
      household_id, title, starts_at, category, owner, created_by
    ) values (
      'a0000000-0000-4000-8000-000000000001',
      'Anon insert',
      '2026-08-13T15:00:00Z',
      'personal',
      'florian',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'anon cannot insert an event'
);

select extensions.throws_ok(
  $$
    update public.events
    set title = 'Anon update'
    where id = 'ae000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'anon cannot update an event'
);

select extensions.throws_ok(
  $$delete from public.events where id = 'ae000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'anon cannot delete an event'
);

select extensions.throws_ok(
  $$select public.create_household('Anon household', 'Anon', 'florian')$$,
  '42501',
  null,
  'anon cannot execute the create-household RPC'
);

select extensions.throws_ok(
  $$
    select public.accept_household_invitation(
      'ab000000-0000-4000-8000-000000000012',
      'Anon'
    )
  $$,
  '42501',
  null,
  'anon cannot execute the accept-invitation RPC'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"10000000-0000-4000-8000-000000000001","email":"member-a@example.test","role":"authenticated"}';

select extensions.lives_ok(
  $$select public.create_household('Bootstrap household', 'Member A', 'florian')$$,
  'an authenticated user calls the exposed RPC to create a household and owner membership'
);

select extensions.results_eq(
  $$select count(*) from public.households where name = 'Bootstrap household'$$,
  array[1::bigint],
  'the creator can read the bootstrapped household'
);

select extensions.throws_ok(
  $$
    select public.accept_household_invitation(
      'ab000000-0000-4000-8000-000000000012',
      'Wrong person'
    )
  $$,
  '22023',
  null,
  'a user cannot accept an invitation sent to another email'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';
set local request.jwt.claims =
  '{"sub":"20000000-0000-4000-8000-000000000002","email":"member-b@example.test","role":"authenticated"}';

reset role;
update auth.users
set email = 'member-b-current@example.test'
where id = '20000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';
set local request.jwt.claims =
  '{"sub":"20000000-0000-4000-8000-000000000002","email":"member-b@example.test","role":"authenticated"}';

select extensions.throws_ok(
  $$
    select public.accept_household_invitation(
      'ab000000-0000-4000-8000-000000000012',
      'Member B'
    )
  $$,
  '22023',
  null,
  'a stale matching JWT email cannot override the current Auth user email mismatch'
);

reset role;
update auth.users
set email = 'member-b@example.test'
where id = '20000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';
set local request.jwt.claims =
  '{"sub":"20000000-0000-4000-8000-000000000002","email":"member-b@example.test","role":"authenticated"}';

select extensions.lives_ok(
  $$
    select public.accept_household_invitation(
      'ab000000-0000-4000-8000-000000000012',
      'Member B'
    )
  $$,
  'the invited user accepts a valid household invitation'
);

select extensions.throws_ok(
  $$
    select public.accept_household_invitation(
      'ab000000-0000-4000-8000-000000000012',
      'Member B'
    )
  $$,
  '22023',
  null,
  'an accepted invitation cannot be replayed'
);

select extensions.results_eq(
  $$
    select count(*)
    from public.household_members
    where household_id = 'a0000000-0000-4000-8000-000000000001'
      and user_id = '20000000-0000-4000-8000-000000000002'
  $$,
  array[1::bigint],
  'the invited user receives exactly one household membership'
);

select extensions.results_eq(
  $$
    select owner
    from public.household_members
    where household_id = 'a0000000-0000-4000-8000-000000000001'
      and user_id = '20000000-0000-4000-8000-000000000002'
  $$,
  array['partner'::text],
  'invitation acceptance uses the owner identity bound by the invitation issuer'
);

reset role;

select * from extensions.finish();
rollback;
