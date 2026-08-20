import { endOfDay, isWithinInterval, startOfDay } from 'date-fns'
import type { ChildItem, Event, HouseholdTask, TodayEntry } from '../../types/domain'

export interface TodayFeedInput {
  events: Event[]
  tasks: HouseholdTask[]
  childItems: ChildItem[]
}

export function buildTodayFeed(input: TodayFeedInput, now: Date): TodayEntry[] {
  const day = { start: startOfDay(now), end: endOfDay(now) }
  const isToday = (timestamp: string) => isWithinInterval(new Date(timestamp), day)

  const events: TodayEntry[] = input.events
    .filter((event) => isToday(event.startsAt))
    .map((event) => ({
      kind: 'event',
      id: event.id,
      title: event.title,
      owner: event.owner,
      effectiveAt: event.startsAt,
      completed: false,
      source: event,
    }))

  const tasks: TodayEntry[] = input.tasks.flatMap((task) => {
    if (task.dueAt === null || !isToday(task.dueAt)) return []
    return [{
      kind: 'task',
      id: task.id,
      title: task.title,
      owner: task.owner,
      effectiveAt: task.dueAt,
      completed: task.completedAt !== null,
      source: task,
    }]
  })

  const childItems: TodayEntry[] = input.childItems.flatMap((item) => {
    if (item.scheduledAt === null || !isToday(item.scheduledAt)) return []
    return [{
      kind: 'child',
      id: item.id,
      title: item.title,
      owner: item.owner,
      effectiveAt: item.scheduledAt,
      completed: item.status === 'completed',
      source: item,
    }]
  })

  return [...events, ...tasks, ...childItems]
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const completionOrder = Number(left.entry.completed) - Number(right.entry.completed)
      if (completionOrder !== 0) return completionOrder

      const timestampOrder =
        new Date(left.entry.effectiveAt).getTime() - new Date(right.entry.effectiveAt).getTime()
      return timestampOrder || left.index - right.index
    })
    .map(({ entry }) => entry)
}
