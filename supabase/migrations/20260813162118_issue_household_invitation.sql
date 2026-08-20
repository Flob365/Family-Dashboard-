create function private.issue_household_invitation(
  target_household_id uuid,
  invited_email text,
  invited_owner text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  normalized_email text := lower(btrim(invited_email));
  invitation_token uuid;
begin
  if caller_id is null then
    raise exception using errcode = '22023', message = 'authentication required';
  end if;

  if target_household_id is null then
    raise exception using errcode = '42501', message = 'household owner access required';
  end if;

  -- Both issuance and acceptance lock the household row before checking member
  -- slots, so authorization and slot occupancy cannot change underneath either.
  perform 1
  from public.households h
  where h.id = target_household_id
  for update;

  if not found or not exists (
      select 1
      from public.household_members hm
      where hm.household_id = target_household_id
        and hm.user_id = caller_id
        and hm.role = 'owner'
    ) then
    raise exception using errcode = '42501', message = 'household owner access required';
  end if;

  if invited_email is null
    or char_length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  then
    raise exception using errcode = '22023', message = 'invalid invited email';
  end if;

  if invited_owner is null or invited_owner not in ('florian', 'partner') then
    raise exception using errcode = '22023', message = 'invalid invited owner';
  end if;

  select lower(btrim(u.email::text))
  into caller_email
  from auth.users u
  where u.id = caller_id;

  if caller_email is null then
    raise exception using errcode = '22023', message = 'current authenticated user email is required';
  end if;

  if normalized_email = caller_email then
    raise exception using errcode = '22023', message = 'cannot invite current authenticated user';
  end if;

  if exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.owner = invited_owner
  ) then
    raise exception using errcode = '22023', message = 'invited owner slot is already occupied';
  end if;

  if exists (
    select 1
    from public.household_members hm
    join auth.users u on u.id = hm.user_id
    where hm.household_id = target_household_id
      and lower(btrim(u.email::text)) = normalized_email
  ) then
    raise exception using errcode = '22023', message = 'email already belongs to a household member';
  end if;

  if exists (
    select 1
    from private.household_invitations i
    where i.household_id = target_household_id
      and i.invited_email = normalized_email
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception using errcode = '22023', message = 'an active invitation already exists for this email';
  end if;

  insert into private.household_invitations (
    household_id,
    invited_email,
    invited_owner,
    invited_by,
    expires_at
  )
  values (
    target_household_id,
    normalized_email,
    invited_owner,
    caller_id,
    now() + interval '7 days'
  )
  returning token into invitation_token;

  return invitation_token;
end;
$$;

create function public.issue_household_invitation(
  target_household_id uuid,
  invited_email text,
  invited_owner text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.issue_household_invitation(
    target_household_id,
    invited_email,
    invited_owner
  );
$$;

revoke all on function private.issue_household_invitation(uuid, text, text) from public, anon;
revoke all on function public.issue_household_invitation(uuid, text, text) from public, anon;
grant execute on function private.issue_household_invitation(uuid, text, text) to authenticated;
grant execute on function public.issue_household_invitation(uuid, text, text) to authenticated;

create or replace function private.accept_household_invitation(
  invitation_token uuid,
  member_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  invitation private.household_invitations%rowtype;
  new_membership_id uuid;
begin
  if caller_id is null then
    raise exception using errcode = '22023', message = 'authentication required';
  end if;
  if invitation_token is null then
    raise exception using errcode = '22023', message = 'invalid invitation token';
  end if;
  if member_display_name is null or char_length(btrim(member_display_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'invalid display name';
  end if;

  select lower(btrim(u.email::text))
  into caller_email
  from auth.users u
  where u.id = caller_id;

  if caller_email is null then
    raise exception using errcode = '22023', message = 'current authenticated user email is required';
  end if;

  select i.*
  into invitation
  from private.household_invitations i
  where i.token = invitation_token;

  if not found then
    raise exception using errcode = '22023', message = 'invitation is invalid or unavailable';
  end if;

  perform 1
  from public.households h
  where h.id = invitation.household_id
  for update;

  select i.*
  into invitation
  from private.household_invitations i
  where i.token = invitation_token
  for update;

  if not found
    or invitation.accepted_at is not null
    or invitation.expires_at <= now()
    or invitation.invited_email <> caller_email
    or exists (
      select 1
      from public.household_members hm
      where hm.household_id = invitation.household_id
        and hm.owner = invitation.invited_owner
    )
  then
    raise exception using errcode = '22023', message = 'invitation is invalid or unavailable';
  end if;

  insert into public.household_members (
    household_id,
    user_id,
    display_name,
    owner,
    role,
    created_by
  )
  values (
    invitation.household_id,
    caller_id,
    btrim(member_display_name),
    invitation.invited_owner,
    'member',
    caller_id
  )
  returning id into new_membership_id;

  update private.household_invitations
  set accepted_at = now(), accepted_by = caller_id
  where token = invitation_token;

  return new_membership_id;
end;
$$;
