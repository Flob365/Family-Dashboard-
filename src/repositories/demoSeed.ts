import type {
  ChildItem,
  Event,
  HouseholdMember,
  HouseholdTask,
  ShoppingItem,
} from '../types/domain'

export interface DemoData {
  events: Event[]
  shoppingItems: ShoppingItem[]
  tasks: HouseholdTask[]
  childItems: ChildItem[]
  householdMembers: HouseholdMember[]
}

const metadata = {
  householdId: 'demo-household',
  createdBy: 'demo-florian',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
}

export const demoSeed: DemoData = {
  events: [
    {
      ...metadata,
      id: 'event-lunch-grandmother',
      title: 'Déjeuner avec Mamie',
      startsAt: '2026-08-13T10:30:00.000Z',
      endsAt: '2026-08-13T12:00:00.000Z',
      location: null,
      category: 'family',
      owner: 'family',
      reminderAt: null,
    },
  ],
  shoppingItems: [
    {
      ...metadata,
      id: 'shopping-milk',
      name: 'Lait',
      quantity: '1 bouteille',
      aisle: 'fresh',
      note: null,
      checkedAt: null,
    },
    {
      ...metadata,
      id: 'shopping-apples',
      name: 'Pommes',
      quantity: null,
      aisle: 'produce',
      note: null,
      checkedAt: null,
    },
    {
      ...metadata,
      id: 'shopping-nappies',
      name: 'Couches',
      quantity: 'Taille 4',
      aisle: 'baby',
      note: null,
      checkedAt: null,
    },
  ],
  tasks: [
    {
      ...metadata,
      id: 'task-bins',
      title: 'Sortir les poubelles',
      owner: 'florian',
      dueAt: '2026-08-13T16:00:00.000Z',
      priority: 'normal',
      recurrence: { unit: 'week', interval: 1 },
      completedAt: null,
    },
  ],
  childItems: [
    {
      ...metadata,
      id: 'child-school-departure',
      kind: 'event',
      space: 'school',
      title: 'Départ école',
      scheduledAt: '2026-08-13T06:10:00.000Z',
      note: null,
      owner: 'florian',
      status: 'pending',
      linkedEventId: null,
    },
    {
      ...metadata,
      id: 'child-nursery-pickup',
      kind: 'event',
      space: 'nursery',
      title: 'Récupérer Jules',
      scheduledAt: '2026-08-13T14:30:00.000Z',
      note: null,
      owner: 'florian',
      status: 'pending',
      linkedEventId: null,
    },
  ],
  householdMembers: [
    {
      ...metadata,
      id: 'member-florian',
      userId: 'demo-florian',
      displayName: 'Florian',
      owner: 'florian',
      role: 'owner',
    },
    {
      ...metadata,
      id: 'member-partner',
      userId: 'demo-partner',
      displayName: 'Partenaire',
      owner: 'partner',
      role: 'member',
    },
  ],
}
