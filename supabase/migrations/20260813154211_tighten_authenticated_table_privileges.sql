-- Hosted projects may retain legacy/default privileges beyond CRUD.
-- Reset authenticated to the exact browser-facing matrix without changing service_role.
revoke all privileges on table
  public.households,
  public.household_members,
  public.events,
  public.shopping_items,
  public.tasks,
  public.child_items,
  public.reminders
from authenticated;

grant select, insert, update, delete on table public.households to authenticated;
grant select on table public.household_members to authenticated;
grant select, insert, update, delete on table
  public.events,
  public.shopping_items,
  public.tasks,
  public.child_items,
  public.reminders
to authenticated;
