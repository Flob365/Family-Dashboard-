import type { QueryClient } from '@tanstack/react-query'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../types/database'
import type {
  BaseEntity,
  ChildItem,
  Event,
  EventCategory,
  HouseholdMember,
  HouseholdTask,
  Owner,
  Recurrence,
  ShoppingAisle,
  ShoppingItem,
  TaskPriority,
} from '../types/domain'
import type { CreateEntity, FamilyRepository, UpdateEntity } from './contracts'

export type FamilyTable =
  | 'events'
  | 'shopping_items'
  | 'tasks'
  | 'child_items'
  | 'household_members'

type PublicTables = Database['public']['Tables']
type FamilyRow = PublicTables[FamilyTable]['Row']

interface BoundaryResult {
  data: unknown
  error: { message: string } | null
}

interface FamilyQueryBuilder extends PromiseLike<BoundaryResult> {
  select(columns: string): FamilyQueryBuilder
  eq(column: string, value: unknown): FamilyQueryBuilder
  single(): Promise<BoundaryResult>
}

interface FamilyTableClient {
  select(columns: string): FamilyQueryBuilder
  insert(payload: Record<string, unknown>): FamilyQueryBuilder
  update(payload: Record<string, unknown>): FamilyQueryBuilder
  delete(): FamilyQueryBuilder
}

interface FamilyClientBoundary {
  from(table: FamilyTable): FamilyTableClient
}

interface DomainByTable {
  events: Event
  shopping_items: ShoppingItem
  tasks: HouseholdTask
  child_items: ChildItem
  household_members: HouseholdMember
}

const realtimeTables = ['events', 'shopping_items', 'tasks', 'child_items'] as const

export function familyQueryKey(householdId: string, table: FamilyTable) {
  return ['family', householdId, table] as const
}

function base(row: {
  id: string
  household_id: string
  created_by: string
  created_at: string
  updated_at: string
}): BaseEntity {
  return {
    id: row.id,
    householdId: row.household_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEvent(row: PublicTables['events']['Row']): Event {
  return {
    ...base(row),
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    category: row.category as EventCategory,
    owner: row.owner as Owner,
    reminderAt: row.reminder_at,
  }
}

function mapShoppingItem(row: PublicTables['shopping_items']['Row']): ShoppingItem {
  return {
    ...base(row),
    name: row.name,
    quantity: row.quantity,
    aisle: row.aisle as ShoppingAisle,
    note: row.note,
    checkedAt: row.checked_at,
  }
}

function mapTask(row: PublicTables['tasks']['Row']): HouseholdTask {
  return {
    ...base(row),
    title: row.title,
    owner: row.owner as Owner,
    dueAt: row.due_at,
    priority: row.priority as TaskPriority,
    recurrence: row.recurrence as Recurrence,
    completedAt: row.completed_at,
  }
}

function mapChildItem(row: PublicTables['child_items']['Row']): ChildItem {
  return {
    ...base(row),
    kind: row.kind as ChildItem['kind'],
    space: row.space as ChildItem['space'],
    title: row.title,
    scheduledAt: row.scheduled_at,
    note: row.note,
    owner: row.owner as Owner,
    status: row.status as ChildItem['status'],
    linkedEventId: row.linked_event_id,
  }
}

function mapHouseholdMember(row: PublicTables['household_members']['Row']): HouseholdMember {
  return {
    ...base(row),
    userId: row.user_id,
    displayName: row.display_name,
    owner: row.owner as HouseholdMember['owner'],
    role: row.role as HouseholdMember['role'],
  }
}

const mappers: { [K in FamilyTable]: (row: PublicTables[K]['Row']) => DomainByTable[K] } = {
  events: mapEvent,
  shopping_items: mapShoppingItem,
  tasks: mapTask,
  child_items: mapChildItem,
  household_members: mapHouseholdMember,
}

interface SupabaseFamilyRepositoryOptions {
  client: SupabaseClient<Database>
  householdId: string
  actorId: string
  queryClient: QueryClient
  now?: () => Date
  createId?: () => string
}

export class SupabaseHouseholdRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async issueInvitation(
    householdId: string,
    invitedEmail: string,
    invitedOwner: HouseholdMember['owner'],
  ): Promise<string> {
    const { data, error } = await this.client.rpc('issue_household_invitation', {
      target_household_id: householdId,
      invited_email: invitedEmail,
      invited_owner: invitedOwner,
    })
    if (error !== null) throw new Error(error.message)
    if (data === null) throw new Error("L’invitation n’a pas pu être créée.")
    return data
  }
}

export class SupabaseFamilyRepository implements FamilyRepository {
  private readonly listeners = new Set<() => void>()
  private readonly mutationTails = new Map<FamilyTable, Promise<void>>()
  private realtimeChannel: RealtimeChannel | undefined
  private readonly now: () => Date
  private readonly createId: () => string

  constructor(private readonly options: SupabaseFamilyRepositoryOptions) {
    this.now = options.now ?? (() => new Date())
    this.createId = options.createId ?? (() => crypto.randomUUID())
  }

  listEvents() {
    return this.list('events')
  }

  createEvent(input: CreateEntity<Event>) {
    return this.create('events', input, {
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location,
      category: input.category,
      owner: input.owner,
      reminder_at: input.reminderAt,
    })
  }

  updateEvent(id: string, changes: UpdateEntity<Event>) {
    return this.update('events', id, changes, {
      ...(changes.title === undefined ? {} : { title: changes.title }),
      ...(changes.startsAt === undefined ? {} : { starts_at: changes.startsAt }),
      ...(changes.endsAt === undefined ? {} : { ends_at: changes.endsAt }),
      ...(changes.location === undefined ? {} : { location: changes.location }),
      ...(changes.category === undefined ? {} : { category: changes.category }),
      ...(changes.owner === undefined ? {} : { owner: changes.owner }),
      ...(changes.reminderAt === undefined ? {} : { reminder_at: changes.reminderAt }),
    })
  }

  removeEvent(id: string) {
    return this.remove('events', id)
  }

  listShoppingItems() {
    return this.list('shopping_items')
  }

  createShoppingItem(input: CreateEntity<ShoppingItem>) {
    return this.create('shopping_items', input, {
      name: input.name,
      quantity: input.quantity,
      aisle: input.aisle,
      note: input.note,
      checked: input.checkedAt !== null,
      checked_at: input.checkedAt,
    })
  }

  updateShoppingItem(id: string, changes: UpdateEntity<ShoppingItem>) {
    return this.update('shopping_items', id, changes, {
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.quantity === undefined ? {} : { quantity: changes.quantity }),
      ...(changes.aisle === undefined ? {} : { aisle: changes.aisle }),
      ...(changes.note === undefined ? {} : { note: changes.note }),
      ...(changes.checkedAt === undefined
        ? {}
        : { checked: changes.checkedAt !== null, checked_at: changes.checkedAt }),
    })
  }

  removeShoppingItem(id: string) {
    return this.remove('shopping_items', id)
  }

  listTasks() {
    return this.list('tasks')
  }

  createTask(input: CreateEntity<HouseholdTask>) {
    return this.create('tasks', input, {
      title: input.title,
      owner: input.owner,
      due_at: input.dueAt,
      priority: input.priority,
      recurrence: input.recurrence as Json,
    })
  }

  updateTask(id: string, changes: UpdateEntity<HouseholdTask>) {
    if (changes.completedAt !== undefined) {
      return Promise.reject(new Error('Use completeTaskOccurrence to change task completion.'))
    }
    return this.update('tasks', id, changes, {
      ...(changes.title === undefined ? {} : { title: changes.title }),
      ...(changes.owner === undefined ? {} : { owner: changes.owner }),
      ...(changes.dueAt === undefined ? {} : { due_at: changes.dueAt }),
      ...(changes.priority === undefined ? {} : { priority: changes.priority }),
      ...(changes.recurrence === undefined ? {} : { recurrence: changes.recurrence as Json }),
    })
  }

  async completeTaskOccurrence(id: string, completedAt: string): Promise<void> {
    const { error } = await this.options.client.rpc('complete_task_occurrence', {
      target_task_id: id,
      occurrence_completed_at: completedAt,
    })
    if (error !== null) throw new Error(error.message)
    await this.options.queryClient.invalidateQueries({
      queryKey: familyQueryKey(this.options.householdId, 'tasks'),
      exact: true,
      refetchType: 'none',
    })
    this.notify()
  }

  removeTask(id: string) {
    return this.remove('tasks', id)
  }

  listChildItems() {
    return this.list('child_items')
  }

  createChildItem(input: CreateEntity<ChildItem>) {
    return this.create('child_items', input, {
      kind: input.kind,
      space: input.space,
      title: input.title,
      scheduled_at: input.scheduledAt,
      note: input.note,
      owner: input.owner,
      status: input.status,
      linked_event_id: input.linkedEventId,
    })
  }

  updateChildItem(id: string, changes: UpdateEntity<ChildItem>) {
    return this.update('child_items', id, changes, {
      ...(changes.kind === undefined ? {} : { kind: changes.kind }),
      ...(changes.space === undefined ? {} : { space: changes.space }),
      ...(changes.title === undefined ? {} : { title: changes.title }),
      ...(changes.scheduledAt === undefined ? {} : { scheduled_at: changes.scheduledAt }),
      ...(changes.note === undefined ? {} : { note: changes.note }),
      ...(changes.owner === undefined ? {} : { owner: changes.owner }),
      ...(changes.status === undefined ? {} : { status: changes.status }),
      ...(changes.linkedEventId === undefined ? {} : { linked_event_id: changes.linkedEventId }),
    })
  }

  removeChildItem(id: string) {
    return this.remove('child_items', id)
  }

  listHouseholdMembers() {
    return this.list('household_members')
  }

  async createHouseholdMember(_input: CreateEntity<HouseholdMember>): Promise<HouseholdMember> {
    void _input
    throw new Error(
      'L’ajout direct d’un membre est désactivé. Une invitation doit être émise par un RPC sécurisé.',
    )
  }

  async updateHouseholdMember(
    _id: string,
    _changes: UpdateEntity<HouseholdMember>,
  ): Promise<HouseholdMember> {
    void _id
    void _changes
    throw new Error('La modification des membres nécessite une opération serveur sécurisée.')
  }

  async removeHouseholdMember(_id: string): Promise<void> {
    void _id
    throw new Error('La suppression des membres nécessite une opération serveur sécurisée.')
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    if (this.listeners.size === 1) this.openRealtimeChannel()

    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.closeRealtimeChannel()
    }
  }

  private async list<K extends FamilyTable>(table: K): Promise<DomainByTable[K][]> {
    return this.options.queryClient.fetchQuery({
      queryKey: familyQueryKey(this.options.householdId, table),
      queryFn: async () => {
        const tableClient = (this.options.client as unknown as FamilyClientBoundary).from(table)
        const { data, error } = await tableClient
          .select('*')
          .eq('household_id', this.options.householdId)
        if (error !== null) throw new Error(error.message)
        const mapper = mappers[table] as (row: FamilyRow) => DomainByTable[K]
        return (data as unknown as FamilyRow[]).map(mapper)
      },
    })
  }

  private create<K extends FamilyTable>(
    table: K,
    input: Omit<DomainByTable[K], keyof BaseEntity>,
    databaseFields: Record<string, unknown>,
  ): Promise<DomainByTable[K]> {
    return this.serializeMutation(table, async () => {
    const timestamp = this.now().toISOString()
    const optimistic = {
      ...input,
      id: this.createId(),
      householdId: this.options.householdId,
      createdBy: this.options.actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as DomainByTable[K]
    const previous = this.optimisticChange(table, (current) => [...current, optimistic])

    try {
      const tableClient = (this.options.client as unknown as FamilyClientBoundary).from(table)
      const { data, error } = await tableClient
        .insert({
          ...databaseFields,
          household_id: this.options.householdId,
        })
        .select('*')
        .single()
      if (error !== null) throw new Error(error.message)
      const saved = (mappers[table] as (row: FamilyRow) => DomainByTable[K])(data as unknown as FamilyRow)
      this.replaceCached(table, optimistic.id, saved)
      return saved
    } catch (error) {
      this.restore(table, previous)
      throw error
    }
    })
  }

  private update<K extends FamilyTable>(
    table: K,
    id: string,
    changes: Partial<Omit<DomainByTable[K], keyof BaseEntity>>,
    databaseFields: Record<string, unknown>,
  ): Promise<DomainByTable[K]> {
    return this.serializeMutation(table, async () => {
    const previous = this.optimisticChange(table, (current) =>
      current.map((item) =>
        item.id === id ? ({ ...item, ...changes, updatedAt: this.now().toISOString() } as DomainByTable[K]) : item,
      ),
    )

    try {
      const tableClient = (this.options.client as unknown as FamilyClientBoundary).from(table)
      const { data, error } = await tableClient
        .update(databaseFields)
        .eq('household_id', this.options.householdId)
        .eq('id', id)
        .select('*')
        .single()
      if (error !== null) throw new Error(error.message)
      const saved = (mappers[table] as (row: FamilyRow) => DomainByTable[K])(data as unknown as FamilyRow)
      this.replaceCached(table, id, saved)
      return saved
    } catch (error) {
      this.restore(table, previous)
      throw error
    }
    })
  }

  private remove<K extends FamilyTable>(table: K, id: string): Promise<void> {
    return this.serializeMutation(table, async () => {
    const previous = this.optimisticChange(table, (current) =>
      current.filter((item) => item.id !== id),
    )

    try {
      const tableClient = (this.options.client as unknown as FamilyClientBoundary).from(table)
      const { error } = await tableClient.delete()
        .eq('household_id', this.options.householdId)
        .eq('id', id)
      if (error !== null) throw new Error(error.message)
    } catch (error) {
      this.restore(table, previous)
      throw error
    }
    })
  }

  private serializeMutation<T>(table: FamilyTable, mutation: () => Promise<T>): Promise<T> {
    const previous = this.mutationTails.get(table) ?? Promise.resolve()
    const result = previous.then(mutation)
    const tail = result.then(
      () => undefined,
      () => undefined,
    )
    this.mutationTails.set(table, tail)
    void tail.then(() => {
      if (this.mutationTails.get(table) === tail) this.mutationTails.delete(table)
    })
    return result
  }

  private optimisticChange<K extends FamilyTable>(
    table: K,
    transform: (current: DomainByTable[K][]) => DomainByTable[K][],
  ) {
    const key = familyQueryKey(this.options.householdId, table)
    const previous = this.options.queryClient.getQueryData<DomainByTable[K][]>(key)
    if (previous !== undefined) this.options.queryClient.setQueryData(key, transform(previous))
    this.notify()
    return previous
  }

  private replaceCached<K extends FamilyTable>(table: K, id: string, saved: DomainByTable[K]) {
    const key = familyQueryKey(this.options.householdId, table)
    const current = this.options.queryClient.getQueryData<DomainByTable[K][]>(key)
    if (current !== undefined) {
      this.options.queryClient.setQueryData(
        key,
        current.map((item) => (item.id === id ? saved : item)),
      )
    }
    this.notify()
  }

  private restore<K extends FamilyTable>(table: K, previous: DomainByTable[K][] | undefined) {
    const key = familyQueryKey(this.options.householdId, table)
    if (previous === undefined) this.options.queryClient.removeQueries({ queryKey: key, exact: true })
    else this.options.queryClient.setQueryData(key, previous)
    this.notify()
  }

  private openRealtimeChannel() {
    if (this.realtimeChannel !== undefined) return
    let channel = this.options.client.channel(`family:${this.options.householdId}`)

    for (const table of realtimeTables) {
      for (const event of ['INSERT', 'UPDATE'] as const) {
        channel = channel.on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table,
            filter: `household_id=eq.${this.options.householdId}`,
          },
          () => this.handleRealtime(table),
        )
      }
      // Supabase cannot apply column filters to DELETE events. With default replica identity,
      // only the deleted primary key is exposed; the callback merely refreshes this household.
      channel = channel.on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table },
        () => this.handleRealtime(table),
      )
    }

    this.realtimeChannel = channel.subscribe()
  }

  private closeRealtimeChannel() {
    if (this.realtimeChannel === undefined) return
    const channel = this.realtimeChannel
    this.realtimeChannel = undefined
    void this.options.client.removeChannel(channel)
  }

  private handleRealtime(table: (typeof realtimeTables)[number]) {
    void this.options.queryClient.invalidateQueries({
      queryKey: familyQueryKey(this.options.householdId, table),
      exact: true,
      refetchType: 'none',
    })
    this.notify()
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }
}
