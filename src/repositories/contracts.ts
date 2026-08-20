import type {
  BaseEntity,
  ChildItem,
  Event,
  HouseholdMember,
  HouseholdTask,
  ShoppingItem,
} from '../types/domain'

export type CreateEntity<T extends BaseEntity> = Omit<T, keyof BaseEntity>
export type UpdateEntity<T extends BaseEntity> = Partial<CreateEntity<T>>

export interface FamilyRepository {
  listEvents(): Promise<Event[]>
  createEvent(input: CreateEntity<Event>): Promise<Event>
  updateEvent(id: string, changes: UpdateEntity<Event>): Promise<Event>
  removeEvent(id: string): Promise<void>

  listShoppingItems(): Promise<ShoppingItem[]>
  createShoppingItem(input: CreateEntity<ShoppingItem>): Promise<ShoppingItem>
  updateShoppingItem(id: string, changes: UpdateEntity<ShoppingItem>): Promise<ShoppingItem>
  removeShoppingItem(id: string): Promise<void>

  listTasks(): Promise<HouseholdTask[]>
  createTask(input: CreateEntity<HouseholdTask>): Promise<HouseholdTask>
  updateTask(id: string, changes: UpdateEntity<HouseholdTask>): Promise<HouseholdTask>
  completeTaskOccurrence(id: string, completedAt: string): Promise<void>
  removeTask(id: string): Promise<void>

  listChildItems(): Promise<ChildItem[]>
  createChildItem(input: CreateEntity<ChildItem>): Promise<ChildItem>
  updateChildItem(id: string, changes: UpdateEntity<ChildItem>): Promise<ChildItem>
  removeChildItem(id: string): Promise<void>

  listHouseholdMembers(): Promise<HouseholdMember[]>
  createHouseholdMember(input: CreateEntity<HouseholdMember>): Promise<HouseholdMember>
  updateHouseholdMember(id: string, changes: UpdateEntity<HouseholdMember>): Promise<HouseholdMember>
  removeHouseholdMember(id: string): Promise<void>

  subscribe(listener: () => void): () => void
}
