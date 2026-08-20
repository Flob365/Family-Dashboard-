alter table public.tasks
  add column recurrence_series_id uuid,
  add column recurrence_occurrence integer;

update public.tasks
set recurrence_series_id = id,
    recurrence_occurrence = 0
where recurrence is not null;

alter table public.tasks
  add constraint tasks_recurrence_occurrence_state check (
    (recurrence is null and recurrence_series_id is null and recurrence_occurrence is null)
    or
    (recurrence is not null and recurrence_series_id is not null and recurrence_occurrence >= 0)
  ),
  add constraint tasks_recurrence_series_fk
    foreign key (household_id, recurrence_series_id)
    references public.tasks (household_id, id)
    on delete restrict;

create unique index tasks_recurrence_occurrence_uidx
  on public.tasks (household_id, recurrence_series_id, recurrence_occurrence)
  where recurrence_series_id is not null;

create function private.set_task_recurrence_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.recurrence is null then
    new.recurrence_series_id := null;
    new.recurrence_occurrence := null;
  elsif new.recurrence_series_id is null then
    new.recurrence_series_id := new.id;
    new.recurrence_occurrence := 0;
  end if;
  return new;
end;
$$;

create trigger tasks_set_recurrence_identity
before insert or update of recurrence on public.tasks
for each row execute function private.set_task_recurrence_identity();

create function private.complete_task_occurrence(
  target_task_id uuid,
  occurrence_completed_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  occurrence public.tasks%rowtype;
  successor_id uuid;
  recurrence_unit text;
  recurrence_interval integer;
  next_due_at timestamptz;
begin
  if caller_id is null then
    raise exception using errcode = '22023', message = 'authentication required';
  end if;
  if target_task_id is null or occurrence_completed_at is null then
    raise exception using errcode = '22023', message = 'task and completion timestamp are required';
  end if;

  select t.*
  into occurrence
  from public.tasks t
  where t.id = target_task_id
  for update;

  if not found or not exists (
    select 1
    from public.household_members hm
    where hm.household_id = occurrence.household_id
      and hm.user_id = caller_id
  ) then
    raise exception using errcode = '42501', message = 'household task access required';
  end if;

  if occurrence.completed_at is not null then
    select t.id
    into successor_id
    from public.tasks t
    where t.household_id = occurrence.household_id
      and t.recurrence_series_id = occurrence.recurrence_series_id
      and t.recurrence_occurrence = occurrence.recurrence_occurrence + 1;
    return coalesce(successor_id, occurrence.id);
  end if;

  update public.tasks
  set completed_at = occurrence_completed_at
  where id = occurrence.id;

  if occurrence.recurrence is null then
    return occurrence.id;
  end if;

  recurrence_unit := occurrence.recurrence ->> 'unit';
  recurrence_interval := (occurrence.recurrence ->> 'interval')::integer;
  next_due_at := (
    (occurrence_completed_at at time zone 'Europe/Paris')
    + case recurrence_unit
        when 'day' then make_interval(days => recurrence_interval)
        when 'week' then make_interval(days => recurrence_interval * 7)
        when 'month' then make_interval(months => recurrence_interval)
      end
  ) at time zone 'Europe/Paris';

  insert into public.tasks (
    household_id, title, owner, due_at, priority, recurrence, completed_at,
    created_by, recurrence_series_id, recurrence_occurrence
  ) values (
    occurrence.household_id, occurrence.title, occurrence.owner, next_due_at,
    occurrence.priority, occurrence.recurrence, null, caller_id,
    occurrence.recurrence_series_id, occurrence.recurrence_occurrence + 1
  )
  on conflict (household_id, recurrence_series_id, recurrence_occurrence)
    where recurrence_series_id is not null
  do update set recurrence_series_id = excluded.recurrence_series_id
  returning id into successor_id;

  return successor_id;
end;
$$;

create function public.complete_task_occurrence(
  target_task_id uuid,
  occurrence_completed_at timestamptz
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.complete_task_occurrence(target_task_id, occurrence_completed_at);
$$;

revoke all on function private.set_task_recurrence_identity() from public, anon, authenticated;
revoke all on function private.complete_task_occurrence(uuid, timestamptz) from public, anon;
revoke all on function public.complete_task_occurrence(uuid, timestamptz) from public, anon;
grant execute on function private.complete_task_occurrence(uuid, timestamptz) to authenticated;
grant execute on function public.complete_task_occurrence(uuid, timestamptz) to authenticated;
