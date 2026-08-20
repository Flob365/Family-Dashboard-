import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ChildItem, Event, HouseholdTask } from '../../types/domain'
import { buildTodayFeed } from './buildTodayFeed'

const metadata = {
  householdId: 'household-1',
  createdBy: 'user-1',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
}

function event(id: string, startsAt: string): Event {
  return {
    ...metadata,
    id,
    title: id,
    startsAt,
    endsAt: null,
    location: null,
    category: 'family',
    owner: 'family',
    reminderAt: null,
  }
}

function task(id: string, dueAt: string, completedAt: string | null = null): HouseholdTask {
  return {
    ...metadata,
    id,
    title: id,
    owner: 'florian',
    dueAt,
    priority: 'normal',
    recurrence: null,
    completedAt,
  }
}

function childItem(
  id: string,
  kind: ChildItem['kind'],
  scheduledAt: string | null,
  status: ChildItem['status'] = 'pending',
): ChildItem {
  return {
    ...metadata,
    id,
    kind,
    space: 'school',
    title: id,
    scheduledAt,
    note: null,
    owner: 'partner',
    status,
    linkedEventId: null,
  }
}

describe('buildTodayFeed', () => {
  const originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  beforeAll(() => {
    vi.stubEnv('TZ', 'Europe/Paris')
  })

  afterAll(() => {
    vi.stubEnv('TZ', originalTimezone)
    vi.unstubAllEnvs()
  })

  it('includes an event inside the Paris local day, including near midnight', () => {
    const entries = buildTodayFeed(
      {
        events: [event('late-event', '2026-08-13T23:30:00+02:00')],
        tasks: [],
        childItems: [],
      },
      new Date('2026-08-13T12:00:00+02:00'),
    )

    expect(entries.map((entry) => entry.id)).toEqual(['late-event'])
  })

  it('excludes an event from tomorrow in the local timezone', () => {
    const entries = buildTodayFeed(
      {
        events: [event('tomorrow', '2026-08-14T00:01:00+02:00')],
        tasks: [],
        childItems: [],
      },
      new Date('2026-08-13T12:00:00+02:00'),
    )

    expect(entries).toEqual([])
  })

  it('includes an incomplete task due today', () => {
    const entries = buildTodayFeed(
      {
        events: [],
        tasks: [task('due-task', '2026-08-13T10:00:00+02:00')],
        childItems: [],
      },
      new Date('2026-08-13T12:00:00+02:00'),
    )

    expect(entries.map((entry) => entry.id)).toEqual(['due-task'])
  })

  it('includes a dated bring item and excludes undated information', () => {
    const entries = buildTodayFeed(
      {
        events: [],
        tasks: [],
        childItems: [
          childItem('bring-swimsuit', 'bring', '2026-08-13T09:00:00+02:00'),
          childItem('general-note', 'information', null),
        ],
      },
      new Date('2026-08-13T12:00:00+02:00'),
    )

    expect(entries.map((entry) => entry.id)).toEqual(['bring-swimsuit'])
  })

  it('sorts incomplete entries chronologically and completed entries last', () => {
    const entries = buildTodayFeed(
      {
        events: [event('breakfast', '2026-08-13T08:00:00+02:00')],
        tasks: [
          task('completed-early', '2026-08-13T07:00:00+02:00', '2026-08-13T07:15:00+02:00'),
          task('late-task', '2026-08-13T10:00:00+02:00'),
        ],
        childItems: [childItem('school-bag', 'bring', '2026-08-13T09:00:00+02:00')],
      },
      new Date('2026-08-13T12:00:00+02:00'),
    )

    expect(entries.map((entry) => entry.kind)).toEqual(['event', 'child', 'task', 'task'])
    expect(entries.map((entry) => entry.id)).toEqual([
      'breakfast',
      'school-bag',
      'late-task',
      'completed-early',
    ])
  })
})
