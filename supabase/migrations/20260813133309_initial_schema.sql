-- Family Command Center v1: household-scoped data and authorization.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema private
  revoke select, insert, update, delete on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke usage, select on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  owner text not null check (owner in ('florian', 'partner')),
  role text not null check (role in ('owner', 'member')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (household_id, owner)
);

create index household_members_user_household_idx
  on public.household_members (user_id, household_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (location is null or char_length(btrim(location)) between 1 and 240),
  category text not null check (category in ('family', 'school', 'nursery', 'health', 'personal')),
  owner text not null check (owner in ('florian', 'partner', 'family')),
  reminder_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_start check (ends_at is null or ends_at >= starts_at),
  unique (household_id, id)
);

create index events_household_starts_at_idx
  on public.events (household_id, starts_at);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  quantity text check (quantity is null or char_length(btrim(quantity)) between 1 and 80),
  aisle text not null check (aisle in ('produce', 'fresh', 'grocery', 'home', 'baby', 'other')),
  note text check (note is null or char_length(note) <= 1000),
  checked boolean not null default false,
  checked_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_items_checked_state check (checked = (checked_at is not null))
);

create index shopping_items_household_checked_idx
  on public.shopping_items (household_id, checked);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  owner text not null check (owner in ('florian', 'partner', 'family')),
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  recurrence jsonb,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_recurrence_shape check (
    recurrence is null
    or (
      jsonb_typeof(recurrence) = 'object'
      and recurrence ?& array['unit', 'interval']
      and recurrence - array['unit', 'interval'] = '{}'::jsonb
      and recurrence ->> 'unit' in ('day', 'week', 'month')
      and jsonb_typeof(recurrence -> 'interval') = 'number'
      and (recurrence ->> 'interval')::integer > 0
      and to_jsonb((recurrence ->> 'interval')::integer) = recurrence -> 'interval'
    )
  ),
  unique (household_id, id)
);

create index tasks_household_due_at_idx
  on public.tasks (household_id, due_at);

create table public.child_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('event', 'bring', 'information')),
  space text not null check (space in ('school', 'nursery')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  scheduled_at timestamptz,
  note text check (note is null or char_length(note) <= 2000),
  owner text not null check (owner in ('florian', 'partner', 'family')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  linked_event_id uuid,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_items_linked_event_fk
    foreign key (household_id, linked_event_id)
    references public.events (household_id, id)
    on delete set null (linked_event_id),
  unique (household_id, id)
);

create index child_items_household_scheduled_at_idx
  on public.child_items (household_id, scheduled_at);

create index child_items_household_linked_event_idx
  on public.child_items (household_id, linked_event_id)
  where linked_event_id is not null;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  event_id uuid,
  task_id uuid,
  child_item_id uuid,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  sent_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_one_source check (num_nonnulls(event_id, task_id, child_item_id) = 1),
  constraint reminders_event_fk
    foreign key (household_id, event_id)
    references public.events (household_id, id)
    on delete cascade,
  constraint reminders_task_fk
    foreign key (household_id, task_id)
    references public.tasks (household_id, id)
    on delete cascade,
  constraint reminders_child_item_fk
    foreign key (household_id, child_item_id)
    references public.child_items (household_id, id)
    on delete cascade
);

create index reminders_household_remind_at_idx
  on public.reminders (household_id, remind_at);
create index reminders_household_event_idx
  on public.reminders (household_id, event_id)
  where event_id is not null;
create index reminders_household_task_idx
  on public.reminders (household_id, task_id)
  where task_id is not null;
create index reminders_household_child_item_idx
  on public.reminders (household_id, child_item_id)
  where child_item_id is not null;

create table private.household_invitations (
  token uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_email text not null check (
    invited_email = lower(btrim(invited_email))
    and char_length(invited_email) between 3 and 320
  ),
  invited_owner text not null check (invited_owner in ('florian', 'partner')),
  invited_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint household_invitations_acceptance_state check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  )
);

create index household_invitations_household_idx
  on private.household_invitations (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.events enable row level security;
alter table public.shopping_items enable row level security;
alter table public.tasks enable row level security;
alter table public.child_items enable row level security;
alter table public.reminders enable row level security;
alter table private.household_invitations enable row level security;

create function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

create policy "members select households"
  on public.households for select to authenticated
  using ((select public.is_household_member(id)));
create policy "members insert households"
  on public.households for insert to authenticated
  with check ((select public.is_household_member(id)));
create policy "members update households"
  on public.households for update to authenticated
  using ((select public.is_household_member(id)))
  with check ((select public.is_household_member(id)));
create policy "members delete households"
  on public.households for delete to authenticated
  using ((select public.is_household_member(id)));

create policy "members read their membership"
  on public.household_members for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "members select events"
  on public.events for select to authenticated
  using ((select public.is_household_member(household_id)));
create policy "members insert events"
  on public.events for insert to authenticated
  with check ((select public.is_household_member(household_id)));
create policy "members update events"
  on public.events for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));
create policy "members delete events"
  on public.events for delete to authenticated
  using ((select public.is_household_member(household_id)));

create policy "members select shopping items"
  on public.shopping_items for select to authenticated
  using ((select public.is_household_member(household_id)));
create policy "members insert shopping items"
  on public.shopping_items for insert to authenticated
  with check ((select public.is_household_member(household_id)));
create policy "members update shopping items"
  on public.shopping_items for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));
create policy "members delete shopping items"
  on public.shopping_items for delete to authenticated
  using ((select public.is_household_member(household_id)));

create policy "members select tasks"
  on public.tasks for select to authenticated
  using ((select public.is_household_member(household_id)));
create policy "members insert tasks"
  on public.tasks for insert to authenticated
  with check ((select public.is_household_member(household_id)));
create policy "members update tasks"
  on public.tasks for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));
create policy "members delete tasks"
  on public.tasks for delete to authenticated
  using ((select public.is_household_member(household_id)));

create policy "members select child items"
  on public.child_items for select to authenticated
  using ((select public.is_household_member(household_id)));
create policy "members insert child items"
  on public.child_items for insert to authenticated
  with check ((select public.is_household_member(household_id)));
create policy "members update child items"
  on public.child_items for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));
create policy "members delete child items"
  on public.child_items for delete to authenticated
  using ((select public.is_household_member(household_id)));

create policy "members select reminders"
  on public.reminders for select to authenticated
  using ((select public.is_household_member(household_id)));
create policy "members insert reminders"
  on public.reminders for insert to authenticated
  with check ((select public.is_household_member(household_id)));
create policy "members update reminders"
  on public.reminders for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));
create policy "members delete reminders"
  on public.reminders for delete to authenticated
  using ((select public.is_household_member(household_id)));

create function private.create_household(
  household_name text,
  creator_display_name text,
  creator_owner text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_household_id uuid;
begin
  if caller_id is null then
    raise exception using errcode = '22023', message = 'authentication required';
  end if;
  if household_name is null or char_length(btrim(household_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'invalid household name';
  end if;
  if creator_display_name is null or char_length(btrim(creator_display_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'invalid display name';
  end if;
  if creator_owner is null or creator_owner not in ('florian', 'partner') then
    raise exception using errcode = '22023', message = 'invalid owner';
  end if;

  insert into public.households (name, created_by)
  values (btrim(household_name), caller_id)
  returning id into new_household_id;

  insert into public.household_members (
    household_id,
    user_id,
    display_name,
    owner,
    role,
    created_by
  )
  values (
    new_household_id,
    caller_id,
    btrim(creator_display_name),
    creator_owner,
    'owner',
    caller_id
  );

  return new_household_id;
end;
$$;

create function private.accept_household_invitation(
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

  select lower(u.email::text)
  into caller_email
  from auth.users u
  where u.id = caller_id;

  if caller_email is null then
    raise exception using errcode = '22023', message = 'current authenticated user email is required';
  end if;

  select i.*
  into invitation
  from private.household_invitations i
  where i.token = invitation_token
  for update;

  if not found
    or invitation.accepted_at is not null
    or invitation.expires_at <= now()
    or invitation.invited_email <> caller_email
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

create function public.create_household(
  household_name text,
  creator_display_name text,
  creator_owner text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_household(
    household_name,
    creator_display_name,
    creator_owner
  );
$$;

create function public.accept_household_invitation(
  invitation_token uuid,
  member_display_name text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_household_invitation(
    invitation_token,
    member_display_name
  );
$$;

revoke all on function private.create_household(text, text, text) from public, anon;
revoke all on function private.accept_household_invitation(uuid, text) from public, anon;
revoke all on function public.create_household(text, text, text) from public, anon;
revoke all on function public.accept_household_invitation(uuid, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.create_household(text, text, text) to authenticated;
grant execute on function private.accept_household_invitation(uuid, text) to authenticated;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.accept_household_invitation(uuid, text) to authenticated;

revoke all on table
  public.households,
  public.household_members,
  public.events,
  public.shopping_items,
  public.tasks,
  public.child_items,
  public.reminders
from anon;

grant select, insert, update, delete on table public.households to authenticated;
grant select on table public.household_members to authenticated;
grant select, insert, update, delete on table
  public.events,
  public.shopping_items,
  public.tasks,
  public.child_items,
  public.reminders
to authenticated;

revoke all on table private.household_invitations from public, anon, authenticated;

alter publication supabase_realtime add table
  public.events,
  public.shopping_items,
  public.tasks,
  public.child_items;
