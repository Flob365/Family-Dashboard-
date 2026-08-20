import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import { createDemoRepository } from '../../repositories/demoRepository'
import { TodayPage } from './TodayPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

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

function createMemoryRepository() {
  let nextId = 0
  return createDemoRepository({
    storage: new MemoryStorage(),
    now: () => new Date('2026-08-13T16:00:00.000Z'),
    createId: () => `today-${++nextId}`,
  })
}

it('adds a task from the quick-add sheet', async () => {
  const repository = createMemoryRepository()
  const existingTasks = await repository.listTasks()
  await Promise.all(existingTasks.map((task) => repository.removeTask(task.id)))

  render(
    <MemoryRouter>
      <TodayPage now={new Date('2026-08-13T16:00:00.000Z')} repository={repository} />
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: /bonjour/i })

  fireEvent.click(await screen.findByRole('button', { name: /^ajouter$/i }))
  fireEvent.click(screen.getByRole('tab', { name: /tâche/i }))
  fireEvent.change(screen.getByLabelText(/titre/i), {
    target: { value: 'Sortir les poubelles' },
  })
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /^ajouter$/i }),
  )

  expect(await screen.findByText('Sortir les poubelles')).toBeVisible()
})

it('shows a due reminder before requesting notification permission from an explicit click', async () => {
  const repository = createMemoryRepository()
  const existingEvents = await repository.listEvents()
  await Promise.all(existingEvents.map((event) => repository.removeEvent(event.id)))
  await repository.createEvent({
    category: 'family',
    endsAt: null,
    location: null,
    owner: 'family',
    reminderAt: '2026-08-13T15:00:00.000Z',
    startsAt: '2026-08-14T10:30:00.000Z',
    title: 'Rendez-vous demain',
  })
  const requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
  class TestNotification {
    static permission: NotificationPermission = 'default'
    static requestPermission = requestPermission
  }
  vi.stubGlobal('Notification', TestNotification)
  const user = userEvent.setup()

  render(
    <MemoryRouter>
      <TodayPage now={new Date('2026-08-13T16:00:00.000Z')} repository={repository} />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Rappels' })).toBeVisible()
  expect(screen.getByText('Rendez-vous demain')).toBeVisible()
  expect(requestPermission).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Activer les notifications' }))
  expect(requestPermission).toHaveBeenCalledOnce()
})

it('does not redeliver the same granted reminder after UI rerenders or repository refreshes', async () => {
  const repository = createMemoryRepository()
  const existingEvents = await repository.listEvents()
  await Promise.all(existingEvents.map((event) => repository.removeEvent(event.id)))
  const firstEvent = await repository.createEvent({
    category: 'family',
    endsAt: null,
    location: null,
    owner: 'family',
    reminderAt: '2026-08-13T15:00:00.000Z',
    startsAt: '2026-08-14T10:30:00.000Z',
    title: 'Rendez-vous demain',
  })
  const show = vi.fn()
  class TestNotification {
    static permission: NotificationPermission = 'granted'
    static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)

    constructor(title: string, options?: NotificationOptions) {
      show(title, options)
    }
  }
  vi.stubGlobal('Notification', TestNotification)
  const user = userEvent.setup()

  const view = render(
    <MemoryRouter>
      <TodayPage now={new Date('2026-08-13T16:00:00.000Z')} repository={repository} />
    </MemoryRouter>,
  )

  await waitFor(() => expect(show).toHaveBeenCalledTimes(1))
  view.rerender(
    <MemoryRouter>
      <TodayPage now={new Date('2026-08-13T16:00:00.000Z')} repository={repository} />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Événement' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer' }))
  expect(show).toHaveBeenCalledTimes(1)

  await repository.updateEvent(firstEvent.id, { title: 'Rendez-vous demain modifié' })
  expect(await screen.findByText('Rendez-vous demain modifié')).toBeVisible()
  expect(show).toHaveBeenCalledTimes(1)

  await repository.createEvent({
    category: 'family',
    endsAt: null,
    location: null,
    owner: 'family',
    reminderAt: '2026-08-13T15:30:00.000Z',
    startsAt: '2026-08-14T12:00:00.000Z',
    title: 'Deuxième rappel',
  })
  expect(await screen.findByText('Deuxième rappel')).toBeVisible()
  await waitFor(() => expect(show).toHaveBeenCalledTimes(2))
})
