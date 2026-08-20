begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(20);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'issue_household_invitation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'target_household_id uuid, invited_email text, invited_owner text'
      and not p.prosecdef
      and exists (
        select 1 from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ),
  'the exposed invitation issuer has the stable fixed-path SECURITY INVOKER signature'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'issue_household_invitation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'target_household_id uuid, invited_email text, invited_owner text'
      and p.prosecdef
      and exists (
        select 1 from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ),
  'the private invitation issuer is fixed-path SECURITY DEFINER'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'issue_household_invitation'
      and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1 from pg_catalog.aclexplode(p.proacl) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
  ),
  'only authenticated can execute the exposed invitation issuer'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'issue_household_invitation'
      and pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1 from pg_catalog.aclexplode(p.proacl) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
  ),
  'the private invitation issuer is not PUBLIC or anon executable'
);

insert into auth.users (id, email)
values
  ('31000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('32000000-0000-4000-8000-000000000002', 'member-a@example.test'),
  ('33000000-0000-4000-8000-000000000003', 'owner-b@example.test'),
  ('34000000-0000-4000-8000-000000000004', 'expired@example.test');

insert into public.households (id, name, created_by)
values
  (
    'ca000000-0000-4000-8000-000000000001',
    'Invitation household A',
    '31000000-0000-4000-8000-000000000001'
  ),
  (
    'cb000000-0000-4000-8000-000000000002',
    'Invitation household B',
    '33000000-0000-4000-8000-000000000003'
  );

insert into public.household_members (
  id, household_id, user_id, display_name, owner, role, created_by
)
values
  (
    'c1000000-0000-4000-8000-000000000001',
    'ca000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    'Owner A',
    'florian',
    'owner',
    '31000000-0000-4000-8000-000000000001'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'ca000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000002',
    'Member A',
    'partner',
    'member',
    '31000000-0000-4000-8000-000000000001'
  ),
  (
    'c3000000-0000-4000-8000-000000000003',
    'cb000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000003',
    'Owner B',
    'florian',
    'owner',
    '33000000-0000-4000-8000-000000000003'
  );

set local role anon;

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'invitee@example.test',
      'partner'
    )
  $$,
  '42501',
  null,
  'anon cannot execute the invitation issuer'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '31000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'cb000000-0000-4000-8000-000000000002',
      'invitee@example.test',
      'partner'
    )
  $$,
  '42501',
  null,
  'an owner cannot issue an invitation for another household'
);

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'owner-a@example.test',
      'partner'
    )
  $$,
  '22023',
  null,
  'an owner cannot invite their own current Auth email'
);

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'member-a@example.test',
      'partner'
    )
  $$,
  '22023',
  null,
  'an owner cannot invite an existing household member email'
);

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'different-invitee@example.test',
      'partner'
    )
  $$,
  '22023',
  null,
  'an owner cannot issue an invitation for an occupied owner slot'
);

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'not-an-email',
      'partner'
    )
  $$,
  '22023',
  null,
  'the issuer rejects an invalid email address'
);

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'invitee@example.test',
      'family'
    )
  $$,
  '22023',
  null,
  'the issuer rejects an invalid owner identity'
);

set local request.jwt.claim.sub = '32000000-0000-4000-8000-000000000002';
set local request.jwt.claims =
  '{"sub":"32000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'invitee@example.test',
      'florian'
    )
  $$,
  '42501',
  null,
  'a non-owner household member cannot issue invitations'
);

reset role;
delete from public.household_members
where id = 'c2000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '31000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      '  Invitee@Example.Test  ',
      'partner'
    )
  $$,
  'an owner issues a household invitation through the exposed RPC'
);

reset role;

select extensions.results_eq(
  $$
    select invited_email
    from private.household_invitations
    where household_id = 'ca000000-0000-4000-8000-000000000001'
      and invited_email = 'invitee@example.test'
  $$,
  array['invitee@example.test'::text],
  'the issuer trims and lowercases the invited email'
);

select extensions.results_eq(
  $$
    select count(*)
    from private.household_invitations
    where household_id = 'ca000000-0000-4000-8000-000000000001'
      and invited_email = 'invitee@example.test'
      and invited_by = '31000000-0000-4000-8000-000000000001'
      and invited_owner = 'partner'
      and accepted_at is null
      and expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute'
  $$,
  array[1::bigint],
  'the pending invitation binds household issuer owner identity and seven-day expiry'
);

select extensions.ok(
  (
    select token is not null
    from private.household_invitations
    where household_id = 'ca000000-0000-4000-8000-000000000001'
      and invited_email = 'invitee@example.test'
  ),
  'the invitation token is generated by the private table default'
);

set local role authenticated;
set local request.jwt.claim.sub = '31000000-0000-4000-8000-000000000001';
set local request.jwt.claims =
  '{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$
    select public.issue_household_invitation(
      'ca000000-0000-4000-8000-000000000001',
      'INVITEE@example.test',
      'partner'
    )
  $$,
  '22023',
  null,
  'a duplicate unexpired unused invitation is rejected after normalization'
);

reset role;
insert into private.household_invitations (
  token, household_id, invited_email, invited_owner, invited_by, expires_at
)
values (
  'ce000000-0000-4000-8000-000000000004',
  'ca000000-0000-4000-8000-000000000001',
  'expired@example.test',
  'partner',
  '31000000-0000-4000-8000-000000000001',
  now() - interval '1 minute'
);
set local role authenticated;
set local request.jwt.claim.sub = '34000000-0000-4000-8000-000000000004';
set local request.jwt.claims =
  '{"sub":"34000000-0000-4000-8000-000000000004","role":"authenticated"}';

select extensions.throws_ok(
  $$
    select public.accept_household_invitation(
      'ce000000-0000-4000-8000-000000000004',
      'Expired invitee'
    )
  $$,
  '22023',
  null,
  'an expired invitation cannot be accepted'
);

reset role;

select extensions.results_eq(
  $$
    select count(*)
    from public.household_members
    where household_id = 'ca000000-0000-4000-8000-000000000001'
      and user_id = '34000000-0000-4000-8000-000000000004'
  $$,
  array[0::bigint],
  'expired invitation rejection creates no membership'
);

select extensions.results_eq(
  $$
    select count(*)
    from private.household_invitations
    where household_id = 'ca000000-0000-4000-8000-000000000001'
      and invited_email = 'invitee@example.test'
      and accepted_at is null
  $$,
  array[1::bigint],
  'duplicate rejection leaves exactly one pending invitation'
);

select * from extensions.finish();
rollback;
