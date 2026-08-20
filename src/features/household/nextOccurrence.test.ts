import { describe, expect, it } from 'vitest'
import { nextOccurrence } from './nextOccurrence'

describe('nextOccurrence', () => {
  it('adds a two-day recurrence interval', () => {
    const result = nextOccurrence(new Date('2026-08-13T18:30:00+02:00'), {
      unit: 'day',
      interval: 2,
    })

    expect(result?.toISOString()).toBe('2026-08-15T16:30:00.000Z')
  })

  it('adds a one-week recurrence interval', () => {
    const result = nextOccurrence(new Date('2026-08-13T18:30:00+02:00'), {
      unit: 'week',
      interval: 1,
    })

    expect(result?.toISOString()).toBe('2026-08-20T16:30:00.000Z')
  })

  it('clamps a January 31 monthly recurrence to the last day of February', () => {
    const result = nextOccurrence(new Date('2026-01-31T09:15:00+01:00'), {
      unit: 'month',
      interval: 1,
    })

    expect(result?.toISOString()).toBe('2026-02-28T08:15:00.000Z')
  })

  it('returns null for a non-recurring task', () => {
    expect(nextOccurrence(new Date('2026-08-13T18:30:00+02:00'), null)).toBeNull()
  })
})
