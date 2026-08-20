begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

select extensions.ok(
  exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_task_occurrence'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'target_task_id uuid, occurrence_completed_at timestamp with time zone'
      and not p.prosecdef
      and exists (select 1 from unnest(p.proconfig) s where s in ('search_path=', 'search_path=""'))
  ),
  'the exposed completion RPC has a fixed path and uses invoker security'
);

select extensions.ok(
  exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'complete_task_occurrence'
      and p.prosecdef
      and exists (select 1 from unnest(p.proconfig) s where s in ('search_path=', 'search_path=""'))
  ),
  'the private transactional completion function is fixed-path security definer'
);

select extensions.ok(
  pg_catalog.has_function_privilege(
    'authenticated', 'public.complete_task_occurrence(uuid,timestamptz)', 'execute'
  )
  and not pg_catalog.has_function_privilege(
    'anon', 'public.complete_task_occurrence(uuid,timestamptz)', 'execute'
  ),
  'only authenticated can execute the public completion RPC'
);

select extensions.ok(
  pg_catalog.has_function_privilege(
    'authenticated', 'private.complete_task_occurrence(uuid,timestamptz)', 'execute'
  )
  and not pg_catalog.has_function_privilege(
    'anon', 'private.complete_task_occurrence(uuid,timestamptz)', 'execute'
  ),
  'the private completion function is unavailable to anon'
);

select extensions.ok(
  exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'public' and tablename = 'tasks'
      and indexname = 'tasks_recurrence_occurrence_uidx'
      and indexdef like 'CREATE UNIQUE INDEX%'
  ),
  'recurrence series and occurrence number have a unique identity'
);

select extensions.ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.tasks', 'insert')
  and pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'title', 'insert')
  and pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'created_by', 'insert')
  and not pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'created_at', 'insert')
  and not pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'completed_at', 'insert')
  and not pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'recurrence_series_id', 'insert'),
  'authenticated inserts exclude completion, timestamps, and server-managed occurrence identity'
);

select extensions.ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.tasks', 'update')
  and pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'title', 'update')
  and not pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'completed_at', 'update')
  and not pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'created_at', 'update')
  and not pg_catalog.has_column_privilege('authenticated', 'public.tasks', 'updated_at', 'update'),
  'authenticated updates exclude immutable and server-managed audit columns'
);

select extensions.ok(
  pg_catalog.has_table_privilege('service_role', 'public.tasks', 'insert')
  and pg_catalog.has_table_privilege('service_role', 'public.tasks', 'update'),
  'service_role table privileges remain intact'
);

insert into auth.users (id, email) values
  ('41000000-0000-4000-8000-000000000001', 'integrity-a@example.test'),
  ('42000000-0000-4000-8000-000000000002', 'integrity-b@example.test');

insert into public.households (id, name, created_by) values
  ('da000000-0000-4000-8000-000000000001', 'Integrity A', '41000000-0000-4000-8000-000000000001'),
  ('db000000-0000-4000-8000-000000000002', 'Integrity B', '42000000-0000-4000-8000-000000000002');

insert into public.household_members
  (household_id, user_id, display_name, owner, role, created_by)
values
  ('da000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'A', 'florian', 'owner', '41000000-0000-4000-8000-000000000001'),
  ('db000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000002', 'B', 'florian', 'owner', '42000000-0000-4000-8000-000000000002');

insert into public.tasks
  (id, household_id, title, owner, due_at, priority, recurrence, created_by)
values
  ('d1000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', 'Weekly A', 'florian', '2026-08-13T09:00:00Z', 'normal', '{"unit":"week","interval":1}', '41000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-000000000002', 'Weekly B', 'florian', '2026-08-13T09:00:00Z', 'normal', '{"unit":"week","interval":1}', '42000000-0000-4000-8000-000000000002');

set local role anon;
select extensions.throws_ok(
  $$ select public.complete_task_occurrence('d1000000-0000-4000-8000-000000000001', now()) $$,
  '42501', null, 'anonymous completion is denied by function ACL'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '41000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$ select public.complete_task_occurrence('d2000000-0000-4000-8000-000000000002', '2026-08-13T12:00:00Z') $$,
  '42501', null, 'a member cannot complete another household task'
);

select extensions.lives_ok(
  $$ select public.complete_task_occurrence('d1000000-0000-4000-8000-000000000001', '2026-08-13T12:00:00Z') $$,
  'a household member completes a recurring occurrence transactionally'
);

reset role;
select extensions.results_eq(
  $$ select completed_at from public.tasks where id = 'd1000000-0000-4000-8000-000000000001' $$,
  array['2026-08-13T12:00:00Z'::timestamptz],
  'the source occurrence is completed'
);

select extensions.results_eq(
  $$ select count(*) from public.tasks where household_id = 'da000000-0000-4000-8000-000000000001' and completed_at is null $$,
  array[1::bigint],
  'one next occurrence is created'
);

select extensions.results_eq(
  $$ select recurrence_occurrence from public.tasks where household_id = 'da000000-0000-4000-8000-000000000001' order by recurrence_occurrence $$,
  array[0, 1],
  'source and successor have stable ordered occurrence identities'
);

set local role authenticated;
set local request.jwt.claim.sub = '41000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.complete_task_occurrence(
  'd1000000-0000-4000-8000-000000000001', '2026-08-13T12:05:00Z'
);
reset role;

select extensions.results_eq(
  $$ select count(*) from public.tasks where household_id = 'da000000-0000-4000-8000-000000000001' $$,
  array[2::bigint],
  'an ambiguous retry creates no duplicate successor'
);

reset role;
insert into public.tasks
  (id, household_id, title, owner, due_at, priority, recurrence, created_by)
values
  ('d3000000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-000000000001',
   'Daily across DST', 'florian', '2026-10-24T16:00:00Z', 'normal',
   '{"unit":"day","interval":1}', '41000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '41000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.lives_ok(
  $$ select public.complete_task_occurrence('d3000000-0000-4000-8000-000000000003', '2026-10-24T16:00:00Z') $$,
  'daily completion across DST succeeds'
);
reset role;

select extensions.results_eq(
  $$
    select due_at from public.tasks
    where recurrence_series_id = 'd3000000-0000-4000-8000-000000000003'
      and recurrence_occurrence = 1
  $$,
  array['2026-10-25T17:00:00Z'::timestamptz],
  'daily recurrence preserves 18:00 Europe/Paris across the autumn DST change'
);

set local role authenticated;
set local request.jwt.claim.sub = '41000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$
    insert into public.shopping_items
      (household_id, name, aisle, checked, created_by)
    values
      ('da000000-0000-4000-8000-000000000001', 'Tamper', 'other', false,
       '42000000-0000-4000-8000-000000000002')
  $$,
  'a legacy client may submit created_by while the trigger controls its stored value'
);

select extensions.lives_ok(
  $$
    insert into public.shopping_items (household_id, name, aisle, checked)
    values ('da000000-0000-4000-8000-000000000001', 'Server audit', 'other', false)
  $$,
  'normal CRUD insert succeeds without client audit fields'
);

reset role;
select extensions.results_eq(
  $$
    select count(*) from public.shopping_items
    where name in ('Tamper', 'Server audit')
      and created_by = '41000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'the insert trigger derives created_by from auth.uid even when the client submits another user'
);

select extensions.ok(
  (
    select created_at = updated_at
    from public.shopping_items
    where name = 'Server audit'
  ),
  'the server initializes both audit timestamps together'
);

select pg_sleep(0.01);
set local role authenticated;
set local request.jwt.claim.sub = '41000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';
update public.shopping_items
set name = 'Server audit changed'
where name = 'Server audit';
reset role;

select extensions.ok(
  (
    select updated_at > created_at
      and created_by = '41000000-0000-4000-8000-000000000001'
    from public.shopping_items
    where name = 'Server audit changed'
  ),
  'normal updates preserve creation audit and advance updated_at'
);

select * from extensions.finish();
rollback;
