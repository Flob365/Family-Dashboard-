import { describe, expect, it } from 'vitest'
import { createDemoRepository, DEMO_STORAGE_KEY } from './demoRepository'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

function repository(storage = new MemoryStorage()) {
  let nextId = 0
  return createDemoRepository({
    storage,
    householdId: 'household-test',
    actorId: 'user-test',
    now: () => new Date('2026-08-13T10:00:00.000Z'),
    createId: () => `generated-${++nextId}`,
  })
}

describe('createDemoRepository', () => {
  it('anchors fresh demo agenda entries to the repository current day', async () => {
    const demo = createDemoRepository({
      storage: new MemoryStorage(),
      now: () => new Date('2026-08-20T10:00:00.000Z'),
    })

    expect((await demo.listEvents())[0]?.startsAt).toBe('2026-08-20T10:30:00.000Z')
    expect((await demo.listTasks())[0]?.dueAt).toBe('2026-08-20T16:00:00.000Z')
    expect((await demo.listChildItems()).map((item) => item.scheduledAt)).toEqual([
      '2026-08-20T06:10:00.000Z',
      '2026-08-20T14:30:00.000Z',
    ])
  })

  it.each([
    ['malformed JSON', '{not-json'],
    ['an invalid document shape', JSON.stringify({ version: 1, events: 'wrong' })],
    ['an unsupported document version', JSON.stringify({ version: 2, events: [] })],
  ])('recovers from %s with validated version-one seed data', async (_case, storedValue) => {
    const storage = new MemoryStorage()
    storage.setItem(DEMO_STORAGE_KEY, storedValue)

    const events = await repository(storage).listEvents()
    const repairedDocument = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? 'null') as {
      version?: unknown
    }

    expect(events.map((event) => event.title)).toContain('Déjeuner avec Mamie')
    expect(repairedDocument.version).toBe(1)
  })

  it.each([
    ['a non-ISO timestamp', 'August 14, 2026 09:00:00'],
    ['an impossible calendar timestamp', '2026-02-31T09:00:00Z'],
  ])('recovers seed data when storage contains %s', async (_case, invalidTimestamp) => {
    const storage = new MemoryStorage()
    await repository(storage).listEvents()
    const storedDocument = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? 'null') as {
      events: Array<{ startsAt: string }>
    }
    storedDocument.events[0]!.startsAt = invalidTimestamp
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(storedDocument))

    const events = await repository(storage).listEvents()
    const repairedDocument = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? 'null') as {
      events: Array<{ startsAt: string }>
    }

    expect(events[0]?.startsAt).toBe('2026-08-13T10:30:00.000Z')
    expect(repairedDocument.events[0]?.startsAt).toBe('2026-08-13T10:30:00.000Z')
  })

  it('persists a created event and reloads it from the versioned document', async () => {
    const storage = new MemoryStorage()
    const firstRepository = repository(storage)

    const created = await firstRepository.createEvent({
      title: 'Dentiste',
      startsAt: '2026-08-14T09:00:00.000Z',
      endsAt: null,
      location: 'Cabinet',
      category: 'health',
      owner: 'florian',
      reminderAt: null,
    })
    const reloadedEvents = await repository(storage).listEvents()

    expect(created).toMatchObject({
      id: 'generated-1',
      householdId: 'household-test',
      createdBy: 'user-test',
      createdAt: '2026-08-13T10:00:00.000Z',
      updatedAt: '2026-08-13T10:00:00.000Z',
    })
    expect(reloadedEvents.some((event) => event.title === 'Dentiste')).toBe(true)
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? 'null')).toMatchObject({ version: 1 })
  })

  it('lists, updates, and removes events', async () => {
    const demo = repository()
    const created = await demo.createEvent({
      title: 'Original event',
      startsAt: '2026-08-14T09:00:00.000Z',
      endsAt: null,
      location: null,
      category: 'family',
      owner: 'family',
      reminderAt: null,
    })

    const updated = await demo.updateEvent(created.id, { title: 'Updated event' })
    expect(updated.title).toBe('Updated event')
    expect((await demo.listEvents()).find((event) => event.id === created.id)?.title).toBe(
      'Updated event',
    )

    await demo.removeEvent(created.id)
    expect((await demo.listEvents()).some((event) => event.id === created.id)).toBe(false)
  })

  it('lists, updates, and removes shopping items', async () => {
    const demo = repository()
    const created = await demo.createShoppingItem({
      name: 'Rice',
      quantity: null,
      aisle: 'grocery',
      note: null,
      checkedAt: null,
    })

    expect((await demo.updateShoppingItem(created.id, { checkedAt: '2026-08-13T10:05:00.000Z' })).checkedAt)
      .toBe('2026-08-13T10:05:00.000Z')
    await demo.removeShoppingItem(created.id)
    expect((await demo.listShoppingItems()).some((item) => item.id === created.id)).toBe(false)
  })

  it('lists, updates, and removes household tasks', async () => {
    const demo = repository()
    const created = await demo.createTask({
      title: 'Water plants',
      owner: 'partner',
      dueAt: null,
      priority: 'normal',
      recurrence: null,
      completedAt: null,
    })

    expect((await demo.updateTask(created.id, { priority: 'high' })).priority).toBe('high')
    await demo.removeTask(created.id)
    expect((await demo.listTasks()).some((task) => task.id === created.id)).toBe(false)
  })

  it('lists, updates, and removes child items', async () => {
    const demo = repository()
    const created = await demo.createChildItem({
      kind: 'bring',
      space: 'nursery',
      title: 'Spare clothes',
      scheduledAt: null,
      note: null,
      owner: 'family',
      status: 'pending',
      linkedEventId: null,
    })

    expect((await demo.updateChildItem(created.id, { status: 'completed' })).status).toBe(
      'completed',
    )
    await demo.removeChildItem(created.id)
    expect((await demo.listChildItems()).some((item) => item.id === created.id)).toBe(false)
  })

  it('lists, updates, and removes household members', async () => {
    const demo = repository()
    const created = await demo.createHouseholdMember({
      userId: 'new-user',
      displayName: 'Alex',
      owner: 'partner',
      role: 'member',
    })

    expect((await demo.updateHouseholdMember(created.id, { displayName: 'Alex P.' })).displayName)
      .toBe('Alex P.')
    await demo.removeHouseholdMember(created.id)
    expect((await demo.listHouseholdMembers()).some((member) => member.id === created.id)).toBe(
      false,
    )
  })

  it('notifies active subscribers once per mutation and stops after unsubscribe', async () => {
    const demo = repository()
    let notifications = 0
    const unsubscribe = demo.subscribe(() => {
      notifications += 1
    })

    await demo.createShoppingItem({
      name: 'Milk',
      quantity: null,
      aisle: 'fresh',
      note: null,
      checkedAt: null,
    })
    unsubscribe()
    await demo.createShoppingItem({
      name: 'Apples',
      quantity: null,
      aisle: 'produce',
      note: null,
      checkedAt: null,
    })

    expect(notifications).toBe(1)
  })

  it('rejects a create with a non-ISO timestamp without persisting or notifying', async () => {
    const storage = new MemoryStorage()
    const demo = repository(storage)
    const storageBefore = storage.getItem(DEMO_STORAGE_KEY)
    let notifications = 0
    demo.subscribe(() => {
      notifications += 1
    })

    await expect(
      demo.createEvent({
        title: 'Invalid event',
        startsAt: 'August 14, 2026 09:00:00',
        endsAt: null,
        location: null,
        category: 'family',
        owner: 'family',
        reminderAt: null,
      }),
    ).rejects.toThrow('Invalid demo repository data')

    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe(storageBefore)
    expect((await demo.listEvents()).some((event) => event.title === 'Invalid event')).toBe(false)
    expect(notifications).toBe(0)
  })

  it('rejects an update with an impossible timestamp without persisting or notifying', async () => {
    const storage = new MemoryStorage()
    const demo = repository(storage)
    const event = (await demo.listEvents())[0]!
    const storageBefore = storage.getItem(DEMO_STORAGE_KEY)
    let notifications = 0
    demo.subscribe(() => {
      notifications += 1
    })

    await expect(
      demo.updateEvent(event.id, { reminderAt: '2026-02-31T09:00:00Z' }),
    ).rejects.toThrow('Invalid demo repository data')

    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe(storageBefore)
    expect((await demo.listEvents())[0]?.reminderAt).toBeNull()
    expect(notifications).toBe(0)
  })

  it('rejects updates and removals for unknown entity ids without notifying', async () => {
    const demo = repository()
    let notifications = 0
    demo.subscribe(() => {
      notifications += 1
    })

    await expect(demo.updateTask('missing', { title: 'No task' })).rejects.toThrow(
      'Household task not found: missing',
    )
    await expect(demo.removeTask('missing')).rejects.toThrow('Household task not found: missing')
    expect(notifications).toBe(0)
  })
})
