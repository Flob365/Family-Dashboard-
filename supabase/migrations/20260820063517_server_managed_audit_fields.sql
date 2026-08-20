create function private.manage_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;

alter table public.households alter column created_by set default auth.uid();
alter table public.household_members alter column created_by set default auth.uid();
alter table public.events alter column created_by set default auth.uid();
alter table public.shopping_items alter column created_by set default auth.uid();
alter table public.tasks alter column created_by set default auth.uid();
alter table public.child_items alter column created_by set default auth.uid();
alter table public.reminders alter column created_by set default auth.uid();

create trigger households_manage_audit_fields before insert or update on public.households
for each row execute function private.manage_audit_fields();
create trigger household_members_manage_audit_fields before insert or update on public.household_members
for each row execute function private.manage_audit_fields();
create trigger events_manage_audit_fields before insert or update on public.events
for each row execute function private.manage_audit_fields();
create trigger shopping_items_manage_audit_fields before insert or update on public.shopping_items
for each row execute function private.manage_audit_fields();
create trigger tasks_manage_audit_fields before insert or update on public.tasks
for each row execute function private.manage_audit_fields();
create trigger child_items_manage_audit_fields before insert or update on public.child_items
for each row execute function private.manage_audit_fields();
create trigger reminders_manage_audit_fields before insert or update on public.reminders
for each row execute function private.manage_audit_fields();

revoke all on function private.manage_audit_fields() from public, anon, authenticated;

revoke insert, update on public.households from authenticated;

revoke insert, update on public.events from authenticated;
grant insert (id, household_id, title, starts_at, ends_at, location, category, owner, reminder_at, created_by)
  on public.events to authenticated;
grant update (title, starts_at, ends_at, location, category, owner, reminder_at)
  on public.events to authenticated;

revoke insert, update on public.shopping_items from authenticated;
grant insert (id, household_id, name, quantity, aisle, note, checked, checked_at, created_by)
  on public.shopping_items to authenticated;
grant update (name, quantity, aisle, note, checked, checked_at)
  on public.shopping_items to authenticated;

revoke insert, update on public.tasks from authenticated;
grant insert (id, household_id, title, owner, due_at, priority, recurrence, created_by)
  on public.tasks to authenticated;
grant update (title, owner, due_at, priority, recurrence)
  on public.tasks to authenticated;

revoke insert, update on public.child_items from authenticated;
grant insert (id, household_id, kind, space, title, scheduled_at, note, owner, status, linked_event_id, created_by)
  on public.child_items to authenticated;
grant update (kind, space, title, scheduled_at, note, owner, status, linked_event_id)
  on public.child_items to authenticated;

revoke insert, update on public.reminders from authenticated;
grant insert (id, household_id, event_id, task_id, child_item_id, remind_at, status, sent_at, created_by)
  on public.reminders to authenticated;
grant update (event_id, task_id, child_item_id, remind_at, status, sent_at)
  on public.reminders to authenticated;

grant select, insert, update, delete on table
  public.households,
  public.household_members,
  public.events,
  public.shopping_items,
  public.tasks,
  public.child_items,
  public.reminders
to service_role;
