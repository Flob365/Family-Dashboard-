import { addDays, addMonths, addWeeks, lastDayOfMonth } from 'date-fns'
import type { Recurrence } from '../../types/domain'

export function nextOccurrence(completedAt: Date, recurrence: Recurrence): Date | null {
  if (recurrence === null) return null

  if (recurrence.unit === 'day') return addDays(completedAt, recurrence.interval)
  if (recurrence.unit === 'week') return addWeeks(completedAt, recurrence.interval)

  const targetMonth = addMonths(completedAt, recurrence.interval)
  const targetMonthLastDay = lastDayOfMonth(targetMonth).getDate()
  targetMonth.setDate(Math.min(completedAt.getDate(), targetMonthLastDay))
  return targetMonth
}
