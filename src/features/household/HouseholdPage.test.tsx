import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../app/App'
import { createTestRepository, withFault } from '../../test/createTestRepository'

it('completes a recurring task and creates exactly one next occurrence', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  render(<App repository={repository} route="/maison" />)
  await user.click(await screen.findByRole('checkbox', { name: /sortir les poubelles/i }))

  const completed = await screen.findByRole('region', { name: /terminées/i })
  expect(await within(completed).findByText('Sortir les poubelles')).toBeVisible()
  const matchingTasks = (await repository.listTasks()).filter(
    (task) => task.title === 'Sortir les poubelles',
  )
  expect(matchingTasks).toHaveLength(2)
  expect(matchingTasks.filter((task) => task.completedAt === null)).toHaveLength(1)
  expect(matchingTasks.filter((task) => task.completedAt !== null)).toHaveLength(1)
})

it('shows an actionable error and leaves a task open when completion fails', async () => {
  const user = userEvent.setup()
  const repository = withFault(createTestRepository(), 'completeTaskOccurrence')
  render(<App repository={repository} route="/maison" />)

  await user.click(await screen.findByRole('checkbox', { name: /sortir les poubelles/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/terminer la tâche/i)
  expect(screen.getByRole('region', { name: /à faire/i })).toHaveTextContent('Sortir les poubelles')
  expect((await repository.listTasks()).filter((task) => task.title === 'Sortir les poubelles')).toHaveLength(1)
})

it('creates recurrent tasks and filters the open list by owner and priority', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  render(<App repository={repository} route="/maison" />)
  await user.click(await screen.findByRole('button', { name: /ajouter une tâche/i }))
  const form = screen.getByRole('dialog', { name: /nouvelle tâche/i })
  await user.type(within(form).getByLabelText(/^titre$/i), 'Arroser les plantes')
  await user.selectOptions(within(form).getByLabelText(/pour qui/i), 'partner')
  await user.selectOptions(within(form).getByLabelText(/^priorité$/i), 'high')
  await user.type(within(form).getByLabelText(/^date$/i), '2026-08-15')
  await user.selectOptions(within(form).getByLabelText(/récurrence/i), 'week')
  await user.type(within(form).getByLabelText(/toutes les/i), '2')
  await user.click(within(form).getByRole('button', { name: /^enregistrer$/i }))

  expect(await screen.findByText('Arroser les plantes')).toBeVisible()
  await user.selectOptions(screen.getByLabelText(/filtrer par personne/i), 'florian')
  expect(screen.queryByText('Arroser les plantes')).not.toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText(/filtrer par personne/i), 'partner')
  await user.selectOptions(screen.getByLabelText(/filtrer par priorité/i), 'high')
  expect(await screen.findByText('Arroser les plantes')).toBeVisible()
})
