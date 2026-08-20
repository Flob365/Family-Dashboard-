export type ReminderPermission = NotificationPermission | 'unsupported'

export interface ReminderRecord {
  householdId?: string
  id: string
  title: string
  reminderAt: string | null
}

export interface NotificationAdapter {
  readonly permission: NotificationPermission
  requestPermission(): Promise<NotificationPermission>
  show(title: string, options: NotificationOptions): void
}

const reminderGracePeriodMs = 24 * 60 * 60 * 1000
const deliveredReminderStorageKey = 'family-command-center.delivered-reminders.v2'
const deliveredReminderIds = new Set<string>()

function deliveryId(reminder: ReminderRecord) {
  return `${reminder.householdId ?? 'local'}|${reminder.id}|${reminder.reminderAt}`
}

function reminderTimestampFromDeliveryId(id: string) {
  const separatorIndex = id.lastIndexOf('|')
  return separatorIndex === -1 ? Number.NaN : new Date(id.slice(separatorIndex + 1)).getTime()
}

function isWithinReminderWindow(id: string, oldestTimestamp: number) {
  const reminderTimestamp = reminderTimestampFromDeliveryId(id)
  return Number.isFinite(reminderTimestamp) && reminderTimestamp >= oldestTimestamp
}

function pruneDeliveredReminderIds(oldestTimestamp: number) {
  deliveredReminderIds.forEach((id) => {
    if (!isWithinReminderWindow(id, oldestTimestamp)) deliveredReminderIds.delete(id)
  })
}

function readDeliveredReminderIds(oldestTimestamp: number) {
  pruneDeliveredReminderIds(oldestTimestamp)
  if (typeof sessionStorage === 'undefined') return
  try {
    const stored = JSON.parse(sessionStorage.getItem(deliveredReminderStorageKey) ?? '[]')
    if (Array.isArray(stored)) {
      stored.forEach((value) => {
        if (typeof value === 'string' && isWithinReminderWindow(value, oldestTimestamp)) {
          deliveredReminderIds.add(value)
        }
      })
    }
  } catch {
    // The in-memory registry remains available when session storage is unavailable or corrupt.
  }
}

function wasDelivered(reminder: ReminderRecord, oldestTimestamp: number) {
  readDeliveredReminderIds(oldestTimestamp)
  return deliveredReminderIds.has(deliveryId(reminder))
}

function markDelivered(reminder: ReminderRecord, oldestTimestamp: number) {
  pruneDeliveredReminderIds(oldestTimestamp)
  deliveredReminderIds.add(deliveryId(reminder))
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(deliveredReminderStorageKey, JSON.stringify([...deliveredReminderIds]))
  } catch {
    // Successful delivery stays guarded by the in-memory registry for this module session.
  }
}

export function getBrowserNotificationAdapter(): NotificationAdapter | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  const BrowserNotification = window.Notification

  return {
    get permission() {
      return BrowserNotification.permission
    },
    requestPermission: () => BrowserNotification.requestPermission(),
    show: (title, options) => {
      new BrowserNotification(title, options)
    },
  }
}

export function getReminderPermission(
  notification: NotificationAdapter | null = getBrowserNotificationAdapter(),
): ReminderPermission {
  return notification?.permission ?? 'unsupported'
}

export async function requestReminderPermissionFromUserGesture(
  notification: NotificationAdapter | null = getBrowserNotificationAdapter(),
): Promise<ReminderPermission> {
  if (notification === null) return 'unsupported'
  return notification.requestPermission()
}

export function getDueReminders(reminders: ReminderRecord[], now = new Date()): ReminderRecord[] {
  const nowTimestamp = now.getTime()
  const oldestTimestamp = nowTimestamp - reminderGracePeriodMs
  return reminders.filter((reminder) => {
    if (reminder.reminderAt === null) return false
    const reminderTimestamp = new Date(reminder.reminderAt).getTime()
    return (
      Number.isFinite(reminderTimestamp) &&
      reminderTimestamp >= oldestTimestamp &&
      reminderTimestamp <= nowTimestamp
    )
  })
}

export function deliverDueReminders(
  reminders: ReminderRecord[],
  now = new Date(),
  notification: NotificationAdapter | null = getBrowserNotificationAdapter(),
): number {
  if (notification?.permission !== 'granted') return 0
  const dueReminders = getDueReminders(reminders, now)
  const oldestTimestamp = now.getTime() - reminderGracePeriodMs
  let deliveredCount = 0
  dueReminders.forEach((reminder) => {
    if (wasDelivered(reminder, oldestTimestamp)) return
    try {
      notification.show(reminder.title, {
        body: 'Rappel Maison',
        tag: `family-command-center-${reminder.id}`,
      })
      markDelivered(reminder, oldestTimestamp)
      deliveredCount += 1
    } catch {
      // Do not mark failed browser notification construction so a later refresh can retry it.
    }
  })
  return deliveredCount
}
