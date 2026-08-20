import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { AddSheet } from './AddSheet'

function renderEventSheet(now: Date, onSubmit = vi.fn(async () => {})) {
  const user = userEvent.setup()
  render(
    <AddSheet
      kind="event"
      now={now}
      onDismiss={() => {}}
      onKindChange={() => {}}
      onSubmit={onSubmit}
      open
    />,
  )
  return { onSubmit, user }
}

it.each([
  ['winter', new Date('2026-01-15T12:00:00.000Z'), '2026-01-15T11:30:00.000Z'],
  ['summer', new Date('2026-08-13T12:00:00.000Z'), '2026-08-13T10:30:00.000Z'],
])('submits a Europe/Paris event with the correct %s UTC offset', async (_season, now, expected) => {
  const { onSubmit, user } = renderEventSheet(now)

  await user.type(screen.getByLabelText('Titre'), 'Déjeuner')
  await user.click(screen.getByText('Ajouter', { selector: 'button' }))

  expect(onSubmit).toHaveBeenCalledWith({
    kind: 'event',
    owner: 'family',
    startsAt: expected,
    title: 'Déjeuner',
  })
})

it('uses the visible Ajouter text in the submit accessible name', () => {
  renderEventSheet(new Date('2026-08-13T12:00:00.000Z'))

  expect(screen.getByRole('button', { name: /^ajouter$/i })).toHaveTextContent('Ajouter')
})

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Ouvrir l’ajout
      </button>
      <AddSheet
        kind="task"
        now={new Date('2026-08-13T12:00:00.000Z')}
        onDismiss={() => setOpen(false)}
        onKindChange={() => {}}
        onSubmit={async () => {}}
        open={open}
      />
    </>
  )
}

it('moves focus into the dialog and traps forward and backward Tab', async () => {
  const user = userEvent.setup()
  render(<DialogHarness />)

  await user.click(screen.getByRole('button', { name: 'Ouvrir l’ajout' }))
  expect(screen.getByLabelText('Titre')).toHaveFocus()

  const dialog = screen.getByRole('dialog')
  within(dialog).getByRole('button', { name: 'Fermer' }).focus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: /^ajouter$/i })).toHaveFocus()

  await user.tab()
  expect(within(dialog).getByRole('button', { name: 'Fermer' })).toHaveFocus()
})

it('dismisses on Escape and restores focus to the opener', async () => {
  const user = userEvent.setup()
  render(<DialogHarness />)
  const opener = screen.getByRole('button', { name: 'Ouvrir l’ajout' })

  await user.click(opener)
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})
