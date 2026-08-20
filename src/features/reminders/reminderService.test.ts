import { describe, expect, it, vi } from 'vitest'
import {
  deliverDueReminders,
  getDueReminders,
  getReminderPermission,
  requestReminderPermissionFromUserGesture,
  type NotificationAdapter,
  type ReminderRecord,
} from './reminderService'

const dueReminder: ReminderRecord = {
  id: 'reminder-due',
  reminderAt: '2026-08-13T08:00:00.000Z',
  title: 'Déjeuner avec Mamie',
}

const futureReminder: ReminderRecord = {
  id: 'reminder-future',
  reminderAt: '2026-08-14T08:00:00.000Z',
  title: 'Rendez-vous demain',
}

function adapter(permission: NotificationPermission): NotificationAdapter {
  return {
    permission,
    requestPermission: vi.fn(async (): Promise<NotificationPermission> => 'granted'),
    show: vi.fn(),
  }
}

describe('reminder notification permission', () => {
  it('keeps due reminders available when the Notification API is unsupported', async () => {
    expect(getReminderPermission(null)).toBe('unsupported')
    expect(getDueReminders([dueReminder], new Date('2026-08-13T10:00:00.000Z'))).toEqual([
      dueReminder,
    ])
    await expect(requestReminderPermissionFromUserGesture(null)).resolves.toBe('unsupported')
  })

  it('does not request default permission until the explicit request function is called', async () => {
    const notification = adapter('default')

    expect(getReminderPermission(notification)).toBe('default')
    expect(
      deliverDueReminders(
        [dueReminder],
        new Date('2026-08-13T10:00:00.000Z'),
        notification,
      ),
    ).toBe(0)
    expect(notification.requestPermission).not.toHaveBeenCalled()

    await expect(requestReminderPermissionFromUserGesture(notification)).resolves.toBe('granted')
    expect(notification.requestPermission).toHaveBeenCalledOnce()
  })

  it('keeps denied reminders visible without creating a browser notification', () => {
    const notification = adapter('denied')

    expect(getDueReminders([dueReminder], new Date('2026-08-13T10:00:00.000Z'))).toEqual([
      dueReminder,
    ])
    expect(
      deliverDueReminders(
        [dueReminder],
        new Date('2026-08-13T10:00:00.000Z'),
        notification,
      ),
    ).toBe(0)
    expect(notification.show).not.toHaveBeenCalled()
  })

  it('delivers only due reminders when permission was already granted', () => {
    const notification = adapter('granted')

    expect(
      deliverDueReminders(
        [dueReminder, futureReminder],
        new Date('2026-08-13T10:00:00.000Z'),
        notification,
      ),
    ).toBe(1)
    expect(notification.show).toHaveBeenCalledWith('Déjeuner avec Mamie', {
      body: 'Rappel Maison',
      tag: 'family-command-center-reminder-due',
    })
    expect(notification.requestPermission).not.toHaveBeenCalled()
  })

  it('delivers each reminder once per household during a browser session', () => {
    const notification = adapter('granted')
    const firstHousehold = { ...dueReminder, householdId: 'household-a', id: 'shared-id' }
    const secondHousehold = { ...dueReminder, householdId: 'household-b', id: 'shared-id' }
    const now = new Date('2026-08-13T10:00:00.000Z')

    expect(deliverDueReminders([firstHousehold], now, notification)).toBe(1)
    expect(deliverDueReminders([firstHousehold], now, notification)).toBe(0)
    expect(deliverDueReminders([secondHousehold], now, notification)).toBe(1)
    expect(notification.show).toHaveBeenCalledTimes(2)
  })

  it('delivers an edited reminder time as a new occurrence', () => {
    const notification = adapter('granted')
    const now = new Date('2026-08-13T10:00:00.000Z')
    const original = { ...dueReminder, householdId: 'household-edit', id: 'edited-id' }
    const edited = { ...original, reminderAt: '2026-08-13T09:00:00.000Z' }

    expect(deliverDueReminders([original], now, notification)).toBe(1)
    expect(deliverDueReminders([edited], now, notification)).toBe(1)
    expect(deliverDueReminders([edited], now, notification)).toBe(0)
    expect(notification.show).toHaveBeenCalledTimes(2)
  })

  it('excludes reminders older than the 24-hour grace window from visibility and delivery', () => {
    const notification = adapter('granted')
    const now = new Date('2026-08-13T10:00:00.000Z')
    sessionStorage.setItem(
      'family-command-center.delivered-reminders.v2',
      JSON.stringify(['household-window|historic-id|2026-08-10T10:00:00.000Z']),
    )
    const boundary = {
      ...dueReminder,
      householdId: 'household-window',
      id: 'boundary-id',
      reminderAt: '2026-08-12T10:00:00.000Z',
    }
    const stale = {
      ...dueReminder,
      householdId: 'household-window',
      id: 'stale-id',
      reminderAt: '2026-08-12T09:59:59.999Z',
    }

    expect(getDueReminders([stale, boundary], now)).toEqual([boundary])
    expect(deliverDueReminders([stale, boundary], now, notification)).toBe(1)
    expect(notification.show).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('family-command-center.delivered-reminders.v2')).not.toContain(
      'historic-id',
    )
  })

  it('retries a reminder when browser notification construction throws', () => {
    const notification = adapter('granted')
    const failingReminder = { ...dueReminder, householdId: 'household-a', id: 'retry-id' }
    const now = new Date('2026-08-13T10:00:00.000Z')
    vi.mocked(notification.show)
      .mockImplementationOnce(() => {
        throw new Error('notification construction failed')
      })
      .mockImplementation(() => undefined)

    expect(deliverDueReminders([failingReminder], now, notification)).toBe(0)
    expect(deliverDueReminders([failingReminder], now, notification)).toBe(1)
    expect(deliverDueReminders([failingReminder], now, notification)).toBe(0)
    expect(notification.show).toHaveBeenCalledTimes(2)
  })
})
