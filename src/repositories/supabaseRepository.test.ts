import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../types/database'
import {
  familyQueryKey,
  SupabaseFamilyRepository,
  type FamilyTable,
} from './supabaseRepository'

type PublicTables = Database['public']['Tables']
type RowByTable = { [K in FamilyTable]: PublicTables[K]['Row'] }

const rows: { [K in FamilyTable]: RowByTable[K][] } = {
  events: [
    {
      id: 'event-a',
      household_id: 'household-a',
      title: 'Dentiste',
      starts_at: '2026-08-14T08:30:00.000Z',
      ends_at: '2026-08-14T09:15:00.000Z',
      location: 'Cabinet central',
      category: 'health',
      owner: 'partner',
      reminder_at: '2026-08-14T07:30:00.000Z',
      created_by: 'user-a',
      created_at: '2026-08-13T10:00:00.000Z',
      updated_at: '2026-08-13T11:00:00.000Z',
    },
  ],
  shopping_items: [
    {
      id: 'shopping-a',
      household_id: 'household-a',
      name: 'Tomates',
      quantity: '6',
      aisle: 'produce',
      note: 'Bien mûres',
      checked: true,
      checked_at: '2026-08-13T12:00:00.000Z',
      created_by: 'user-a',
      created_at: '2026-08-13T10:00:00.000Z',
      updated_at: '2026-08-13T12:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 'task-a',
      household_id: 'household-a',
      title: 'Arroser les plantes',
      owner: 'family',
      due_at: '2026-08-15T18:00:00.000Z',
      priority: 'high',
      recurrence: { unit: 'week', interval: 2 },
      recurrence_occurrence: 0,
      recurrence_series_id: 'task-a',
      completed_at: null,
      created_by: 'user-a',
      created_at: '2026-08-13T10:00:00.000Z',
      updated_at: '2026-08-13T11:00:00.000Z',
    },
  ],
  child_items: [
    {
      id: 'child-a',
      household_id: 'household-a',
      kind: 'bring',
      space: 'school',
      title: 'Tenue de sport',
      scheduled_at: '2026-08-18T07:30:00.000Z',
      note: 'Sac bleu',
      owner: 'florian',
      status: 'pending',
      linked_event_id: 'event-a',
      created_by: 'user-a',
      created_at: '2026-08-13T10:00:00.000Z',
      updated_at: '2026-08-13T11:00:00.000Z',
    },
  ],
  household_members: [
    {
      id: 'member-a',
      household_id: 'household-a',
      user_id: 'user-a',
      display_name: 'Florian',
      owner: 'florian',
      role: 'owner',
      created_by: 'user-a',
      created_at: '2026-08-13T10:00:00.000Z',
      updated_at: '2026-08-13T11:00:00.000Z',
    },
  ],
}

interface QueryRecord {
  table: FamilyTable
  operation: 'select' | 'insert' | 'update' | 'delete'
  payload?: Record<string, unknown>
  filters: Array<[string, unknown]>
}

interface RealtimeRegistration {
  config: { event: string; schema: string; table: string; filter?: string }
  callback: () => void
}

type BoundaryResult = { data: unknown; error: { message: string } | null }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function updatedShoppingRow(name: string): RowByTable['shopping_items'] {
  return { ...rows.shopping_items[0], name, updated_at: '2026-08-13T13:00:00.000Z' }
}

function createFakeSupabase(options: {
  failUpdate?: boolean
  updateResults?: Promise<BoundaryResult>[]
} = {}) {
  const data = structuredClone(rows) as { [K in FamilyTable]: RowByTable[K][] }
  const queries: QueryRecord[] = []
  const realtime: RealtimeRegistration[] = []
  const removedChannels: unknown[] = []
  const channelCalls: string[] = []
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []

  function builder(
    table: FamilyTable,
    operation: QueryRecord['operation'],
    payload?: Record<string, unknown>,
  ) {
    const filters: Array<[string, unknown]> = []
    let executed = false
    let result: Promise<{ data: unknown; error: { message: string } | null }> | undefined

    const execute = () => {
      if (result !== undefined) return result
      if (!executed) {
        queries.push({ table, operation, payload, filters: [...filters] })
        executed = true
      }
      if (operation === 'update' && options.failUpdate) {
        result = Promise.resolve({ data: null, error: { message: 'network unavailable' } })
        return result
      }
      if (operation === 'update' && options.updateResults?.length) {
        result = options.updateResults.shift()!
        return result
      }

      const matching = (data[table] as Array<Record<string, unknown>>).filter((row) =>
        filters.every(([column, value]) => row[column] === value),
      )
      if (operation === 'select') result = Promise.resolve({ data: structuredClone(matching), error: null })
      else if (operation === 'insert') {
        const timestamp = '2026-08-13T13:00:00.000Z'
        const inserted = {
          id: 'inserted-a',
          created_at: timestamp,
          updated_at: timestamp,
          ...payload,
        }
        ;(data[table] as Array<Record<string, unknown>>).push(inserted)
        result = Promise.resolve({ data: structuredClone(inserted), error: null })
      } else if (operation === 'update') {
        const updated = { ...matching[0], ...payload, updated_at: '2026-08-13T13:00:00.000Z' }
        result = Promise.resolve({ data: structuredClone(updated), error: null })
      } else {
        result = Promise.resolve({ data: null, error: null })
      }
      return result
    }

    const chain = {
      select() {
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push([column, value])
        return chain
      },
      single: async () => execute(),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        execute().then(resolve, reject),
    }
    return chain
  }

  const channel = {
    on(_type: string, config: RealtimeRegistration['config'], callback: () => void) {
      realtime.push({ config, callback })
      return channel
    },
    subscribe() {
      return channel
    },
  }

  const client = {
    from(table: FamilyTable) {
      return {
        select: () => builder(table, 'select'),
        insert: (payload: Record<string, unknown>) => builder(table, 'insert', payload),
        update: (payload: Record<string, unknown>) => builder(table, 'update', payload),
        delete: () => builder(table, 'delete'),
      }
    },
    channel: (name: string) => {
      channelCalls.push(name)
      return channel
    },
    removeChannel: async (removed: unknown) => {
      removedChannels.push(removed)
      return 'ok'
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args })
      return { data: 'task-a', error: null }
    },
  }

  return { client, queries, realtime, removedChannels, channelCalls, rpcCalls }
}

function makeRepository(boundary = createFakeSupabase()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  const repository = new SupabaseFamilyRepository({
    client: boundary.client as never,
    householdId: 'household-a',
    actorId: 'user-a',
    queryClient,
    now: () => new Date('2026-08-13T12:30:00.000Z'),
    createId: () => 'optimistic-a',
  })
  return { boundary, queryClient, repository }
}

describe('SupabaseFamilyRepository', () => {
  it('maps complete snake_case rows to camelCase domain objects without dropping domain values', async () => {
    const { repository } = makeRepository()

    expect(await repository.listEvents()).toEqual([
      {
        id: 'event-a', householdId: 'household-a', title: 'Dentiste',
        startsAt: '2026-08-14T08:30:00.000Z', endsAt: '2026-08-14T09:15:00.000Z',
        location: 'Cabinet central', category: 'health', owner: 'partner',
        reminderAt: '2026-08-14T07:30:00.000Z', createdBy: 'user-a',
        createdAt: '2026-08-13T10:00:00.000Z', updatedAt: '2026-08-13T11:00:00.000Z',
      },
    ])
    expect(await repository.listShoppingItems()).toEqual([
      {
        id: 'shopping-a', householdId: 'household-a', name: 'Tomates', quantity: '6',
        aisle: 'produce', note: 'Bien mûres', checkedAt: '2026-08-13T12:00:00.000Z',
        createdBy: 'user-a', createdAt: '2026-08-13T10:00:00.000Z',
        updatedAt: '2026-08-13T12:00:00.000Z',
      },
    ])
    expect(await repository.listTasks()).toEqual([
      {
        id: 'task-a', householdId: 'household-a', title: 'Arroser les plantes', owner: 'family',
        dueAt: '2026-08-15T18:00:00.000Z', priority: 'high',
        recurrence: { unit: 'week', interval: 2 }, completedAt: null, createdBy: 'user-a',
        createdAt: '2026-08-13T10:00:00.000Z', updatedAt: '2026-08-13T11:00:00.000Z',
      },
    ])
    expect(await repository.listChildItems()).toEqual([
      {
        id: 'child-a', householdId: 'household-a', kind: 'bring', space: 'school',
        title: 'Tenue de sport', scheduledAt: '2026-08-18T07:30:00.000Z', note: 'Sac bleu',
        owner: 'florian', status: 'pending', linkedEventId: 'event-a', createdBy: 'user-a',
        createdAt: '2026-08-13T10:00:00.000Z', updatedAt: '2026-08-13T11:00:00.000Z',
      },
    ])
    expect(await repository.listHouseholdMembers()).toEqual([
      {
        id: 'member-a', householdId: 'household-a', userId: 'user-a', displayName: 'Florian',
        owner: 'florian', role: 'owner', createdBy: 'user-a',
        createdAt: '2026-08-13T10:00:00.000Z', updatedAt: '2026-08-13T11:00:00.000Z',
      },
    ])
  })

  it('scopes reads and writes to the active household in addition to RLS', async () => {
    const { boundary, repository } = makeRepository()

    await repository.listEvents()
    await repository.createShoppingItem({
      name: 'Café', quantity: null, aisle: 'grocery', note: null, checkedAt: null,
    })
    await repository.updateShoppingItem('shopping-a', { name: 'Tomates cerises' })
    await repository.removeShoppingItem('shopping-a')

    expect(boundary.queries).toEqual([
      { table: 'events', operation: 'select', filters: [['household_id', 'household-a']], payload: undefined },
      expect.objectContaining({
        table: 'shopping_items', operation: 'insert',
        payload: expect.objectContaining({ household_id: 'household-a' }),
      }),
      expect.objectContaining({
        table: 'shopping_items', operation: 'update',
        filters: [['household_id', 'household-a'], ['id', 'shopping-a']],
      }),
      expect.objectContaining({
        table: 'shopping_items', operation: 'delete',
        filters: [['household_id', 'household-a'], ['id', 'shopping-a']],
      }),
    ])
    expect(boundary.queries[1]?.payload).not.toHaveProperty('created_by')
  })

  it('restores the exact prior query cache when an optimistic mutation fails', async () => {
    const boundary = createFakeSupabase({ failUpdate: true })
    const { queryClient, repository } = makeRepository(boundary)
    const before = await repository.listShoppingItems()

    await expect(repository.updateShoppingItem('shopping-a', { name: 'Valeur optimiste' })).rejects.toThrow(
      'network unavailable',
    )

    expect(queryClient.getQueryData(familyQueryKey('household-a', 'shopping_items'))).toEqual(before)
  })

  it('completes one recurring occurrence through the idempotent transactional RPC', async () => {
    const { boundary, queryClient, repository } = makeRepository()
    await repository.listTasks()

    const completeOccurrence = (
      repository as unknown as {
        completeTaskOccurrence(id: string, completedAt: string): Promise<void>
      }
    ).completeTaskOccurrence
    expect(typeof completeOccurrence).toBe('function')
    await completeOccurrence.call(repository, 'task-a', '2026-08-13T12:30:00.000Z')

    expect(boundary.rpcCalls).toEqual([{
      name: 'complete_task_occurrence',
      args: {
        target_task_id: 'task-a',
        occurrence_completed_at: '2026-08-13T12:30:00.000Z',
      },
    }])
    expect(boundary.queries.filter(({ operation }) => operation === 'update')).toHaveLength(0)
    expect(boundary.queries.filter(({ operation }) => operation === 'insert')).toHaveLength(0)
    expect(queryClient.getQueryState(familyQueryKey('household-a', 'tasks'))?.isInvalidated).toBe(true)
  })

  it('keeps task completion out of direct connected inserts and updates', async () => {
    const { boundary, repository } = makeRepository()

    await repository.createTask({
      title: 'Nettoyer le filtre',
      owner: 'family',
      dueAt: '2026-08-20T16:00:00.000Z',
      priority: 'normal',
      recurrence: { unit: 'week', interval: 1 },
      completedAt: null,
    })
    expect(boundary.queries.at(-1)?.payload).not.toHaveProperty('completed_at')

    await expect(
      repository.updateTask('task-a', { completedAt: '2026-08-20T16:05:00.000Z' }),
    ).rejects.toThrow(/completeTaskOccurrence/)
    expect(boundary.queries.filter(({ operation }) => operation === 'update')).toHaveLength(0)
  })

  it('serializes same-table mutations so first failure cannot erase the following success', async () => {
    const firstResult = deferred<BoundaryResult>()
    const secondResult = deferred<BoundaryResult>()
    const boundary = createFakeSupabase({
      updateResults: [firstResult.promise, secondResult.promise],
    })
    const { queryClient, repository } = makeRepository(boundary)
    await repository.listShoppingItems()

    const first = repository.updateShoppingItem('shopping-a', { name: 'Échec optimiste' })
    const firstOutcome = first.catch((error: unknown) => error)
    const second = repository.updateShoppingItem('shopping-a', { name: 'Succès conservé' })
    await Promise.resolve()
    expect(boundary.queries.filter(({ operation }) => operation === 'update')).toHaveLength(1)

    firstResult.resolve({ data: null, error: { message: 'first failed' } })
    expect(await firstOutcome).toEqual(expect.objectContaining({ message: 'first failed' }))
    await vi.waitFor(() => {
      expect(boundary.queries.filter(({ operation }) => operation === 'update')).toHaveLength(2)
    })
    secondResult.resolve({ data: updatedShoppingRow('Succès conservé'), error: null })
    await second

    expect(queryClient.getQueryData(familyQueryKey('household-a', 'shopping_items'))).toEqual([
      expect.objectContaining({ name: 'Succès conservé' }),
    ])
  })

  it('serializes same-table mutations so a later failure rolls back to the first success', async () => {
    const firstResult = deferred<BoundaryResult>()
    const secondResult = deferred<BoundaryResult>()
    const boundary = createFakeSupabase({
      updateResults: [firstResult.promise, secondResult.promise],
    })
    const { queryClient, repository } = makeRepository(boundary)
    await repository.listShoppingItems()

    const first = repository.updateShoppingItem('shopping-a', { name: 'Premier succès' })
    const second = repository.updateShoppingItem('shopping-a', { name: 'Échec suivant' })
    const secondOutcome = second.catch((error: unknown) => error)
    await Promise.resolve()
    expect(boundary.queries.filter(({ operation }) => operation === 'update')).toHaveLength(1)

    firstResult.resolve({ data: updatedShoppingRow('Premier succès'), error: null })
    await first
    await vi.waitFor(() => {
      expect(boundary.queries.filter(({ operation }) => operation === 'update')).toHaveLength(2)
    })
    secondResult.resolve({ data: null, error: { message: 'second failed' } })
    expect(await secondOutcome).toEqual(expect.objectContaining({ message: 'second failed' }))

    expect(queryClient.getQueryData(familyQueryKey('household-a', 'shopping_items'))).toEqual([
      expect.objectContaining({ name: 'Premier succès' }),
    ])
  })

  it('registers the complete Realtime event matrix, invalidates each affected query, and shares one channel until final cleanup', async () => {
    const { boundary, queryClient, repository } = makeRepository()
    const firstCleanup = repository.subscribe(() => undefined)
    const secondCleanup = repository.subscribe(() => undefined)

    expect(boundary.channelCalls).toEqual(['family:household-a'])
    expect(boundary.realtime).toHaveLength(12)

    for (const table of ['events', 'shopping_items', 'tasks', 'child_items'] as const) {
      for (const event of ['INSERT', 'UPDATE', 'DELETE'] as const) {
        const registration = boundary.realtime.find(
          (candidate) => candidate.config.table === table && candidate.config.event === event,
        )
        expect(registration?.config).toEqual({
          event,
          schema: 'public',
          table,
          ...(event === 'DELETE' ? {} : { filter: 'household_id=eq.household-a' }),
        })

        const key = familyQueryKey('household-a', table)
        queryClient.setQueryData(key, [])
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false)
        registration?.callback()
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
      }
    }

    firstCleanup()
    expect(boundary.removedChannels).toHaveLength(0)
    secondCleanup()
    expect(boundary.removedChannels).toHaveLength(1)
  })
})
