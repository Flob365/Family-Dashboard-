import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../app/App'
import { createTestRepository, withFault } from '../../test/createTestRepository'

it('creates, edits, and deletes an event from the chronological list', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()

  render(<App repository={repository} route="/agenda" />)
  await user.click(await screen.findByRole('button', { name: /ajouter un événement/i }))
  await user.type(screen.getByLabelText(/^titre$/i), 'Pédiatre Jules')
  await user.type(screen.getByLabelText(/^date$/i), '2026-08-14')
  await user.type(screen.getByLabelText(/heure de début/i), '09:30')
  await user.selectOptions(screen.getByLabelText(/pour qui/i), 'partner')
  await user.selectOptions(screen.getByLabelText(/catégorie/i), 'health')
  await user.type(screen.getByLabelText(/lieu/i), 'Cabinet des Lilas')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  expect(await screen.findByText('Pédiatre Jules')).toBeVisible()
  expect((await repository.listEvents()).find((event) => event.title === 'Pédiatre Jules')).toMatchObject({
    category: 'health',
    location: 'Cabinet des Lilas',
    owner: 'partner',
  })

  await user.click(screen.getByRole('button', { name: /modifier pédiatre jules/i }))
  const title = screen.getByLabelText(/^titre$/i)
  await user.clear(title)
  await user.type(title, 'Pédiatre Louise')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  expect(await screen.findByText('Pédiatre Louise')).toBeVisible()
  expect((await repository.listEvents()).filter((event) => /Pédiatre/.test(event.title))).toHaveLength(1)

  await user.click(screen.getByRole('button', { name: /modifier pédiatre louise/i }))
  await user.click(screen.getByRole('button', { name: /supprimer/i }))
  const confirmation = screen.getByRole('alertdialog', { name: /supprimer l’événement/i })
  await user.click(within(confirmation).getByRole('button', { name: /^supprimer$/i }))

  expect(screen.queryByText('Pédiatre Louise')).not.toBeInTheDocument()
  expect((await repository.listEvents()).some((event) => /Pédiatre/.test(event.title))).toBe(false)
})

it('switches between the default list and compact week views', async () => {
  const user = userEvent.setup()
  render(<App repository={createTestRepository()} route="/agenda" />)
  const listControl = await screen.findByRole('button', { name: /^liste$/i })
  expect(listControl).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('region', { name: /liste chronologique/i })).toBeVisible()

  await user.click(screen.getByRole('button', { name: /^semaine$/i }))

  expect(screen.getByRole('region', { name: /semaine/i })).toBeVisible()
  expect(listControl).toHaveAttribute('aria-pressed', 'false')
})

it('keeps the form open and offers a retry after a failed mutation', async () => {
  const user = userEvent.setup()
  const repository = withFault(createTestRepository(), 'createEvent')
  render(<App repository={repository} route="/agenda" />)

  await user.click(await screen.findByRole('button', { name: /ajouter un événement/i }))
  await user.type(screen.getByLabelText(/^titre$/i), 'Dentiste')
  await user.type(screen.getByLabelText(/^date$/i), '2026-08-18')
  await user.type(screen.getByLabelText(/heure de début/i), '10:00')
  await user.click(screen.getByRole('button', { name: /^enregistrer$/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrer l’événement/i)
  expect(screen.getByRole('dialog', { name: /nouvel événement/i })).toBeVisible()
  await user.click(screen.getByRole('button', { name: /réessayer/i }))
  expect(await screen.findByText('Dentiste')).toBeVisible()
})

it('makes form sheets modal, traps focus, closes on Escape, and restores focus', async () => {
  const user = userEvent.setup()
  render(<App repository={createTestRepository()} route="/agenda" />)
  const opener = await screen.findByRole('button', { name: /ajouter un événement/i })
  await user.click(opener)

  const dialog = screen.getByRole('dialog', { name: /nouvel événement/i })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  const title = screen.getByLabelText(/^titre$/i)
  expect(title).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: /^annuler$/i })).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: /^enregistrer$/i })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(dialog).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

it('keeps the event form open when Escape dismisses its nested delete confirmation', async () => {
  const user = userEvent.setup()
  render(<App repository={createTestRepository()} route="/agenda" />)
  const editButtons = await screen.findAllByRole('button', { name: /modifier/i })
  await user.click(editButtons[0])
  const deleteOpener = screen.getByRole('button', { name: /^supprimer$/i })
  await user.click(deleteOpener)

  const confirmation = screen.getByRole('alertdialog', { name: /supprimer l’événement/i })
  expect(within(confirmation).getByRole('button', { name: /annuler/i })).toHaveFocus()
  await user.keyboard('{Escape}')

  expect(confirmation).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: /modifier l’événement/i })).toBeVisible()
  expect(deleteOpener).toHaveFocus()
})
