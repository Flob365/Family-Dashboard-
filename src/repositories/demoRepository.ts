import { z } from 'zod'
import { addDays, differenceInCalendarDays } from 'date-fns'
import type {
  BaseEntity,
  ChildItem,
  Event,
  HouseholdMember,
  HouseholdTask,
  ShoppingItem,
} from '../types/domain'
import type { CreateEntity, FamilyRepository, UpdateEntity } from './contracts'
import { demoSeed, type DemoData } from './demoSeed'

export const DEMO_STORAGE_KEY = 'family-command-center:demo:v1'

const isoTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/

function isStrictIsoTimestamp(value: string) {
  const match = isoTimestampPattern.exec(value)
  if (match === null) return false

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] =
    match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText)
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (daysInMonth[month - 1] ?? 0) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  )
}

const timestampSchema = z.string().refine(isStrictIsoTimestamp)
const ownerSchema = z.enum(['florian', 'partner', 'family'])
const entitySchema = z.object({
  id: z.string(),
  householdId: z.string(),
  createdBy: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

const eventSchema = entitySchema.extend({
  title: z.string(),
  startsAt: timestampSchema,
  endsAt: timestampSchema.nullable(),
  location: z.string().nullable(),
  category: z.enum(['family', 'school', 'nursery', 'health', 'personal']),
  owner: ownerSchema,
  reminderAt: timestampSchema.nullable(),
})

const shoppingItemSchema = entitySchema.extend({
  name: z.string(),
  quantity: z.string().nullable(),
  aisle: z.enum(['produce', 'fresh', 'grocery', 'home', 'baby', 'other']),
  note: z.string().nullable(),
  checkedAt: timestampSchema.nullable(),
})

const recurrenceSchema = z
  .object({
    unit: z.enum(['day', 'week', 'month']),
    interval: z.number().int().positive(),
  })
  .nullable()

const taskSchema = entitySchema.extend({
  title: z.string(),
  owner: ownerSchema,
  dueAt: timestampSchema.nullable(),
  priority: z.enum(['low', 'normal', 'high']),
  recurrence: recurrenceSchema,
  completedAt: timestampSchema.nullable(),
})

const childItemSchema = entitySchema.extend({
  kind: z.enum(['event', 'bring', 'information']),
  space: z.enum(['school', 'nursery']),
  title: z.string(),
  scheduledAt: timestampSchema.nullable(),
  note: z.string().nullable(),
  owner: ownerSchema,
  status: z.enum(['pending', 'completed']),
  linkedEventId: z.string().nullable().default(null),
})

const householdMemberSchema = entitySchema.extend({
  userId: z.string(),
  displayName: z.string(),
  owner: z.enum(['florian', 'partner']),
  role: z.enum(['owner', 'member']),
})

const demoDocumentSchema = z.object({
  version: z.literal(1),
  events: z.array(eventSchema),
  shoppingItems: z.array(shoppingItemSchema),
  tasks: z.array(taskSchema),
  childItems: z.array(childItemSchema),
  householdMembers: z.array(householdMemberSchema),
})

interface DemoDocument extends DemoData {
  version: 1
}

type CollectionName = keyof DemoData
type CollectionEntity<K extends CollectionName> = DemoData[K][number]

export interface DemoRepositoryOptions {
  storage?: Storage
  householdId?: string
  actorId?: string
  now?: () => Date
  createId?: () => string
}

const demoAnchorDay = new Date('2026-08-13T12:00:00.000Z')

function seededDocument(now: Date): DemoDocument {
  const dayOffset = differenceInCalendarDays(now, demoAnchorDay)
  const shiftedSeed = JSON.parse(JSON.stringify(demoSeed, (_key, value: unknown) => {
    if (typeof value !== 'string' || !isStrictIsoTimestamp(value)) return value
    return addDays(new Date(value), dayOffset).toISOString()
  })) as DemoData
  return { version: 1, ...shiftedSeed }
}

function loadDocument(storage: Storage, now: Date): DemoDocument {
  const stored = storage.getItem(DEMO_STORAGE_KEY)
  if (stored !== null) {
    try {
      const result = demoDocumentSchema.safeParse(JSON.parse(stored))
      if (result.success) return result.data as DemoDocument
    } catch {
      // A corrupt demo cache is disposable; repair it from the validated seed below.
    }
  }

  const fallback = seededDocument(now)
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fallback))
  return fallback
}

class DemoFamilyRepository implements FamilyRepository {
  private readonly listeners = new Set<() => void>()
  private state: DemoDocument

  constructor(
    private readonly storage: Storage,
    private readonly householdId: string,
    private readonly actorId: string,
    private readonly now: () => Date,
    private readonly createId: () => string,
  ) {
    this.state = loadDocument(storage, this.now())
  }

  listEvents() {
    return this.list(this.state.events)
  }

  createEvent(input: CreateEntity<Event>) {
    return this.create('events', input)
  }

  updateEvent(id: string, changes: UpdateEntity<Event>) {
    return this.update('events', 'Event', id, changes)
  }

  removeEvent(id: string) {
    return this.remove('events', 'Event', id)
  }

  listShoppingItems() {
    return this.list(this.state.shoppingItems)
  }

  createShoppingItem(input: CreateEntity<ShoppingItem>) {
    return this.create('shoppingItems', input)
  }

  updateShoppingItem(id: string, changes: UpdateEntity<ShoppingItem>) {
    return this.update('shoppingItems', 'Shopping item', id, changes)
  }

  removeShoppingItem(id: string) {
    return this.remove('shoppingItems', 'Shopping item', id)
  }

  listTasks() {
    return this.list(this.state.tasks)
  }

  createTask(input: CreateEntity<HouseholdTask>) {
    return this.create('tasks', input)
  }

  updateTask(id: string, changes: UpdateEntity<HouseholdTask>) {
    return this.update('tasks', 'Household task', id, changes)
  }

  async completeTaskOccurrence(id: string, completedAt: string): Promise<void> {
    const next = structuredClone(this.state)
    const task = next.tasks.find((candidate) => candidate.id === id)
    if (task === undefined) throw new Error(`Household task not found: ${id}`)
    if (task.completedAt !== null) return

    task.completedAt = completedAt
    task.updatedAt = this.now().toISOString()
    if (task.recurrence !== null) {
      const nextDueAt = new Date(completedAt)
      if (task.recurrence.unit === 'day') nextDueAt.setDate(nextDueAt.getDate() + task.recurrence.interval)
      else if (task.recurrence.unit === 'week') nextDueAt.setDate(nextDueAt.getDate() + 7 * task.recurrence.interval)
      else {
        const originalDay = nextDueAt.getDate()
        nextDueAt.setDate(1)
        nextDueAt.setMonth(nextDueAt.getMonth() + task.recurrence.interval)
        const lastDay = new Date(nextDueAt.getFullYear(), nextDueAt.getMonth() + 1, 0).getDate()
        nextDueAt.setDate(Math.min(originalDay, lastDay))
      }
      const timestamp = this.now().toISOString()
      next.tasks.push({
        ...task,
        id: this.createId(),
        dueAt: nextDueAt.toISOString(),
        completedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
    this.commit(next)
  }

  removeTask(id: string) {
    return this.remove('tasks', 'Household task', id)
  }

  listChildItems() {
    return this.list(this.state.childItems)
  }

  createChildItem(input: CreateEntity<ChildItem>) {
    return this.create('childItems', input)
  }

  updateChildItem(id: string, changes: UpdateEntity<ChildItem>) {
    return this.update('childItems', 'Child item', id, changes)
  }

  removeChildItem(id: string) {
    return this.remove('childItems', 'Child item', id)
  }

  listHouseholdMembers() {
    return this.list(this.state.householdMembers)
  }

  createHouseholdMember(input: CreateEntity<HouseholdMember>) {
    return this.create('householdMembers', input)
  }

  updateHouseholdMember(id: string, changes: UpdateEntity<HouseholdMember>) {
    return this.update('householdMembers', 'Household member', id, changes)
  }

  removeHouseholdMember(id: string) {
    return this.remove('householdMembers', 'Household member', id)
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private async list<T extends BaseEntity>(collection: T[]): Promise<T[]> {
    return structuredClone(collection)
  }

  private async create<K extends CollectionName>(
    collectionName: K,
    input: Omit<CollectionEntity<K>, keyof BaseEntity>,
  ): Promise<CollectionEntity<K>> {
    const timestamp = this.now().toISOString()
    const entity = {
      ...input,
      id: this.createId(),
      householdId: this.householdId,
      createdBy: this.actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as CollectionEntity<K>
    const next = structuredClone(this.state)
    const collection = next[collectionName] as CollectionEntity<K>[]
    collection.push(entity)
    this.commit(next)
    return structuredClone(entity)
  }

  private async update<K extends CollectionName>(
    collectionName: K,
    label: string,
    id: string,
    changes: Partial<Omit<CollectionEntity<K>, keyof BaseEntity>>,
  ): Promise<CollectionEntity<K>> {
    const next = structuredClone(this.state)
    const collection = next[collectionName] as CollectionEntity<K>[]
    const index = collection.findIndex((entity) => entity.id === id)
    if (index < 0) throw new Error(`${label} not found: ${id}`)

    const updated = {
      ...collection[index],
      ...changes,
      updatedAt: this.now().toISOString(),
    } as CollectionEntity<K>
    collection[index] = updated
    this.commit(next)
    return structuredClone(updated)
  }

  private async remove<K extends CollectionName>(collectionName: K, label: string, id: string) {
    const next = structuredClone(this.state)
    const collection = next[collectionName] as CollectionEntity<K>[]
    const index = collection.findIndex((entity) => entity.id === id)
    if (index < 0) throw new Error(`${label} not found: ${id}`)

    collection.splice(index, 1)
    this.commit(next)
  }

  private commit(next: DemoDocument) {
    const result = demoDocumentSchema.safeParse(next)
    if (!result.success) throw new Error('Invalid demo repository data')

    const validated = result.data as DemoDocument
    this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(validated))
    this.state = validated
    this.listeners.forEach((listener) => listener())
  }
}

export function createDemoRepository(options: DemoRepositoryOptions = {}): FamilyRepository {
  return new DemoFamilyRepository(
    options.storage ?? window.localStorage,
    options.householdId ?? 'demo-household',
    options.actorId ?? 'demo-florian',
    options.now ?? (() => new Date()),
    options.createId ?? (() => crypto.randomUUID()),
  )
}
