import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Bell,
  ChevronRight,
  ClipboardCheck,
  Plus,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { VoiceControl } from '../../app/AppShell'
import { AddSheet, type QuickAddPayload } from '../../components/AddSheet'
import { ErrorState } from '../../components/ErrorState'
import type { FamilyRepository } from '../../repositories/contracts'
import type { ChildItem, Event, HouseholdTask, ShoppingItem } from '../../types/domain'
import {
  deliverDueReminders,
  getDueReminders,
  getReminderPermission,
  requestReminderPermissionFromUserGesture,
  type ReminderPermission,
} from '../reminders/reminderService'
import { buildTodayFeed } from './buildTodayFeed'
import { Timeline } from './Timeline'

interface TodayPageProps {
  now?: Date
  repository: FamilyRepository
}

type QuickAddKind = QuickAddPayload['kind']

interface TodayData {
  childItems: ChildItem[]
  events: Event[]
  shoppingItems: ShoppingItem[]
  tasks: HouseholdTask[]
}

const emptyData: TodayData = { childItems: [], events: [], shoppingItems: [], tasks: [] }

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 760px)').matches === true
}

function displayDate(now: Date) {
  const value = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
    weekday: 'long',
  }).format(now)
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function TodayPage({ now: suppliedNow, repository }: TodayPageProps) {
  const [fallbackNow] = useState(() => new Date())
  const now = suppliedNow ?? fallbackNow
  const [data, setData] = useState<TodayData>(emptyData)
  const [error, setError] = useState(false)
  const [sheetKind, setSheetKind] = useState<QuickAddKind>('event')
  const [reminderPermission, setReminderPermission] = useState<ReminderPermission>(
    getReminderPermission,
  )
  const [desktopInitialOpen] = useState(isDesktopViewport)
  const [sheetOpen, setSheetOpen] = useState(desktopInitialOpen)

  const load = useCallback(async () => {
    try {
      const [events, tasks, childItems, shoppingItems] = await Promise.all([
        repository.listEvents(),
        repository.listTasks(),
        repository.listChildItems(),
        repository.listShoppingItems(),
      ])
      setData({ childItems, events, shoppingItems, tasks })
      setError(false)
    } catch {
      setError(true)
    }
  }, [repository])

  useEffect(() => {
    void load()
    return repository.subscribe(() => {
      void load()
    })
  }, [load, repository])

  function openSheet(kind: QuickAddKind) {
    setSheetKind(kind)
    setSheetOpen(true)
  }

  async function create(payload: QuickAddPayload) {
    if (payload.kind === 'event') {
      await repository.createEvent({
        category: 'family',
        endsAt: null,
        location: null,
        owner: payload.owner,
        reminderAt: null,
        startsAt: payload.startsAt,
        title: payload.title,
      })
    } else if (payload.kind === 'task') {
      await repository.createTask({
        completedAt: null,
        dueAt: payload.dueAt,
        owner: payload.owner,
        priority: 'normal',
        recurrence: null,
        title: payload.title,
      })
    } else {
      await repository.createShoppingItem({
        aisle: payload.aisle,
        checkedAt: null,
        name: payload.name,
        note: null,
        quantity: payload.quantity,
      })
    }
    await load()
    setSheetOpen(false)
  }

  const feed = buildTodayFeed(data, now)
  const dueReminders = useMemo(() => getDueReminders(data.events, now), [data.events, now])
  const openEntries = feed.filter((entry) => !entry.completed)
  const completedEntries = feed.filter((entry) => entry.completed)
  const shoppingRemainder = data.shoppingItems.filter((item) => item.checkedAt === null)

  useEffect(() => {
    if (reminderPermission === 'granted') deliverDueReminders(dueReminders, now)
  }, [dueReminders, now, reminderPermission])

  async function enableNotifications() {
    setReminderPermission(await requestReminderPermissionFromUserGesture())
  }

  return (
    <div className={`today-page ${sheetOpen ? 'today-page--sheet-open' : ''}`}>
      <div className="today-page__content">
        <header className="today-heading">
          <h1>Bonjour Florian</h1>
          <p>{displayDate(now)}</p>
        </header>

        {error ? (
          <ErrorState onRetry={() => void load()} />
        ) : (
          <>
            <Timeline entries={openEntries} />
            {completedEntries.length === 0 ? null : (
              <details className="completed-timeline">
                <summary>Terminés</summary>
                <Timeline entries={completedEntries} />
              </details>
            )}
          </>
        )}

        {shoppingRemainder.length === 0 ? null : (
          <section className="shopping-remainder">
            <div className="shopping-remainder__heading">
              <ShoppingCart aria-hidden="true" />
              <strong>Courses</strong>
              <span>· {shoppingRemainder.length} articles</span>
              <Link to="/courses">
                Voir la liste
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
            <ul>
              {shoppingRemainder.slice(0, 3).map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          </section>
        )}

        {dueReminders.length === 0 ? null : (
          <section aria-labelledby="due-reminders-title" className="due-reminders">
            <div className="due-reminders__heading">
              <Bell aria-hidden="true" />
              <h2 id="due-reminders-title">Rappels</h2>
            </div>
            <ul>
              {dueReminders.map((reminder) => (
                <li key={reminder.id}>{reminder.title}</li>
              ))}
            </ul>
            {reminderPermission === 'default' ? (
              <button className="text-button" onClick={() => void enableNotifications()} type="button">
                Activer les notifications
              </button>
            ) : null}
            {reminderPermission === 'denied' ? (
              <p>Notifications refusées — vos rappels restent visibles ici.</p>
            ) : null}
            {reminderPermission === 'unsupported' ? (
              <p>Notifications indisponibles — vos rappels restent visibles ici.</p>
            ) : null}
          </section>
        )}

        <div className="quick-actions" aria-label="Ajout rapide">
          <button onClick={() => openSheet('event')} type="button">
            <CalendarDays aria-hidden="true" />
            Événement
          </button>
          <button onClick={() => openSheet('task')} type="button">
            <ClipboardCheck aria-hidden="true" />
            Tâche
          </button>
          <button onClick={() => openSheet('shopping')} type="button">
            <ShoppingBag aria-hidden="true" />
            Article
          </button>
        </div>

        <div className="today-actions">
          <button aria-label="Ajouter" className="today-add" onClick={() => openSheet('event')} type="button">
            <Plus aria-hidden="true" />
          </button>
          <VoiceControl className="voice-control--mobile" />
        </div>
      </div>

      <AddSheet
        kind={sheetKind}
        now={now}
        onDismiss={() => setSheetOpen(false)}
        onKindChange={setSheetKind}
        onSubmit={create}
        open={sheetOpen}
        presetTitle={desktopInitialOpen ? 'Déjeuner avec Mamie' : ''}
      />
    </div>
  )
}
