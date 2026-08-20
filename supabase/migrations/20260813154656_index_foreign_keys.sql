-- Cover foreign-key lookups reported by the hosted performance advisor.
create index household_invitations_accepted_by_idx
  on private.household_invitations (accepted_by)
  where accepted_by is not null;

create index household_invitations_invited_by_idx
  on private.household_invitations (invited_by);

create index child_items_created_by_idx
  on public.child_items (created_by);

create index events_created_by_idx
  on public.events (created_by);

create index household_members_created_by_idx
  on public.household_members (created_by);

create index households_created_by_idx
  on public.households (created_by);

create index reminders_created_by_idx
  on public.reminders (created_by);

create index shopping_items_created_by_idx
  on public.shopping_items (created_by);

create index tasks_created_by_idx
  on public.tasks (created_by);
