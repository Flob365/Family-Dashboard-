export type IsoTimestamp = string

export type Owner = 'florian' | 'partner' | 'family'
export type ChildSpace = 'school' | 'nursery'
export type ChildItemKind = 'event' | 'bring' | 'information'
export type ShoppingAisle = 'produce' | 'fresh' | 'grocery' | 'home' | 'baby' | 'other'
export type EventCategory = 'family' | 'school' | 'nursery' | 'health' | 'personal'
export type TaskPriority = 'low' | 'normal' | 'high'
export type Recurrence = { unit: 'day' | 'week' | 'month'; interval: number } | null

export interface BaseEntity {
  id: string
  householdId: string
  createdBy: string
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface Event extends BaseEntity {
  title: string
  startsAt: IsoTimestamp
  endsAt: IsoTimestamp | null
  location: string | null
  category: EventCategory
  owner: Owner
  reminderAt: IsoTimestamp | null
}

export interface ShoppingItem extends BaseEntity {
  name: string
  quantity: string | null
  aisle: ShoppingAisle
  note: string | null
  checkedAt: IsoTimestamp | null
}

export interface HouseholdTask extends BaseEntity {
  title: string
  owner: Owner
  dueAt: IsoTimestamp | null
  priority: TaskPriority
  recurrence: Recurrence
  completedAt: IsoTimestamp | null
}

interface ChildItemFields extends BaseEntity {
  space: ChildSpace
  title: string
  scheduledAt: IsoTimestamp | null
  note: string | null
  owner: Owner
  status: 'pending' | 'completed'
  linkedEventId: string | null
}

export type ChildItem =
  | (ChildItemFields & { kind: 'event' })
  | (ChildItemFields & { kind: 'bring' })
  | (ChildItemFields & { kind: 'information' })

export interface HouseholdMember extends BaseEntity {
  userId: string
  displayName: string
  owner: Exclude<Owner, 'family'>
  role: 'owner' | 'member'
}

interface TodayEntryFields {
  id: string
  title: string
  owner: Owner
  effectiveAt: IsoTimestamp
  completed: boolean
}

export type TodayEntry =
  | (TodayEntryFields & { kind: 'event'; source: Event })
  | (TodayEntryFields & { kind: 'task'; source: HouseholdTask })
  | (TodayEntryFields & { kind: 'child'; source: ChildItem })
