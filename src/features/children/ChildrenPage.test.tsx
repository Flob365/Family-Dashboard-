import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../app/App'
import { createTestRepository, withFault, withFaultOnCall } from '../../test/createTestRepository'

it('switches École and Crèche and creates an À apporter item locally', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  render(<App repository={repository} route="/enfants/ecole" />)
  expect(await screen.findByRole('link', { name: /école/i })).toHaveAttribute('aria-current', 'page')
  await user.click(screen.getByRole('link', { name: /crèche/i }))
  expect(await screen.findByRole('link', { name: /crèche/i })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('Récupérer Jules')).toBeVisible()

  await user.click(screen.getByRole('link', { name: /école/i }))
  const bringSection = await screen.findByRole('region', { name: /à apporter/i })
  await user.click(within(bringSection).getByRole('button', { name: /ajouter/i }))
  await user.type(screen.getByLabelText(/^titre$/i), 'Autorisation signée')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  expect(within(await screen.findByRole('region', { name: /à apporter/i })).getByText('Autorisation signée')).toBeVisible()
  expect((await repository.listEvents()).some((event) => event.title === 'Autorisation signée')).toBe(false)
})

it('updates only the stably linked event when duplicate tuples exist', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  const duplicate = {
    title: 'Réunion double',
    startsAt: '2026-09-01T16:00:00.000Z',
    endsAt: null,
    location: null,
    category: 'school' as const,
    owner: 'family' as const,
    reminderAt: null,
  }
  const unrelatedA = await repository.createEvent(duplicate)
  const unrelatedB = await repository.createEvent(duplicate)
  render(<App repository={repository} route="/enfants/ecole" />)
  const upcoming = await screen.findByRole('region', { name: /à venir/i })
  await user.click(within(upcoming).getByRole('button', { name: /ajouter/i }))
  await user.type(screen.getByLabelText(/^titre$/i), duplicate.title)
  await user.type(screen.getByLabelText(/^date$/i), '2026-09-01')
  await user.type(screen.getByLabelText(/^heure$/i), '18:00')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  const child = (await repository.listChildItems()).find((item) => item.title === duplicate.title)
  expect(child?.linkedEventId).toBeTruthy()
  expect(child?.linkedEventId).not.toBe(unrelatedA.id)
  expect(child?.linkedEventId).not.toBe(unrelatedB.id)

  await user.click(screen.getByRole('button', { name: /modifier réunion double/i }))
  const title = screen.getByLabelText(/^titre$/i)
  await user.clear(title)
  await user.type(title, 'Réunion liée')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  const events = await repository.listEvents()
  expect(events.find((event) => event.id === unrelatedA.id)?.title).toBe(duplicate.title)
  expect(events.find((event) => event.id === unrelatedB.id)?.title).toBe(duplicate.title)
  expect(events.find((event) => event.id === child?.linkedEventId)?.title).toBe('Réunion liée')

  await user.click(screen.getByRole('button', { name: /modifier réunion liée/i }))
  await user.click(screen.getByRole('button', { name: /^supprimer$/i }))
  const afterDelete = await repository.listEvents()
  expect(afterDelete.find((event) => event.id === child?.linkedEventId)).toBeUndefined()
  expect(afterDelete.find((event) => event.id === unrelatedA.id)?.title).toBe(duplicate.title)
  expect(afterDelete.find((event) => event.id === unrelatedB.id)?.title).toBe(duplicate.title)
})

async function submitChildEvent(user: ReturnType<typeof userEvent.setup>) {
  const upcoming = await screen.findByRole('region', { name: /à venir/i })
  await user.click(within(upcoming).getByRole('button', { name: /ajouter/i }))
  await user.type(screen.getByLabelText(/^titre$/i), 'Sortie musée')
  await user.type(screen.getByLabelText(/^date$/i), '2026-09-03')
  await user.type(screen.getByLabelText(/^heure$/i), '09:00')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))
}

it('leaves no partial child item when the first coupled calendar write fails', async () => {
  const user = userEvent.setup()
  const base = createTestRepository()
  const repository = withFault(base, 'createEvent')
  render(<App repository={repository} route="/enfants/ecole" />)

  await submitChildEvent(user)

  expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrer l’élément/i)
  expect((await base.listChildItems()).some((item) => item.title === 'Sortie musée')).toBe(false)
  expect((await base.listEvents()).some((event) => event.title === 'Sortie musée')).toBe(false)
})

it('compensates the calendar write when the second coupled child write fails', async () => {
  const user = userEvent.setup()
  const base = createTestRepository()
  const repository = withFault(base, 'createChildItem')
  render(<App repository={repository} route="/enfants/ecole" />)

  await submitChildEvent(user)

  expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrer l’élément/i)
  expect((await base.listChildItems()).some((item) => item.title === 'Sortie musée')).toBe(false)
  expect((await base.listEvents()).some((event) => event.title === 'Sortie musée')).toBe(false)
})

it('creates and updates one linked calendar event for a dated child event', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  render(<App repository={repository} route="/enfants/ecole" />)
  const upcoming = await screen.findByRole('region', { name: /à venir/i })
  await user.click(within(upcoming).getByRole('button', { name: /ajouter/i }))
  await user.type(screen.getByLabelText(/^titre$/i), 'Réunion de rentrée')
  await user.type(screen.getByLabelText(/^date$/i), '2026-09-01')
  await user.type(screen.getByLabelText(/^heure$/i), '18:00')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  await user.click(screen.getByRole('button', { name: /modifier réunion de rentrée/i }))
  const title = screen.getByLabelText(/^titre$/i)
  await user.clear(title)
  await user.type(title, 'Réunion parents')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  const linkedEvents = (await repository.listEvents()).filter((event) => /Réunion/.test(event.title))
  expect(linkedEvents).toHaveLength(1)
  expect(linkedEvents[0]).toMatchObject({
    title: 'Réunion parents',
    category: 'school',
    owner: 'family',
  })
})

it('retries a compensated linked delete using the recreated event id without leaving an orphan', async () => {
  const user = userEvent.setup()
  const base = createTestRepository()
  const repository = withFaultOnCall(base, 'removeChildItem', 1)
  render(<App repository={repository} route="/enfants/ecole" />)
  await submitChildEvent(user)
  const original = (await base.listChildItems()).find((item) => item.title === 'Sortie musée')

  await user.click(screen.getByRole('button', { name: /modifier sortie musée/i }))
  await user.click(screen.getByRole('button', { name: /^supprimer$/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/supprimer l’élément/i)
  const compensated = (await base.listChildItems()).find((item) => item.id === original?.id)
  expect(compensated?.linkedEventId).toBeTruthy()
  expect(compensated?.linkedEventId).not.toBe(original?.linkedEventId)
  await user.click(screen.getByRole('button', { name: /réessayer/i }))

  expect((await base.listChildItems()).find((item) => item.id === original?.id)).toBeUndefined()
  expect((await base.listEvents()).find((event) => event.id === compensated?.linkedEventId)).toBeUndefined()
  expect((await base.listEvents()).some((event) => event.title === 'Sortie musée')).toBe(false)
})
