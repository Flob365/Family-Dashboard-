import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../app/App'
import { createTestRepository, withFault, withFaultOnCall } from '../../test/createTestRepository'

it('groups open items in aisle order and moves a checked item to Pris', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  await repository.createShoppingItem({
    name: 'Compotes',
    quantity: null,
    aisle: 'grocery',
    note: null,
    checkedAt: null,
  })

  render(<App repository={repository} route="/courses" />)
  const openItems = await screen.findByRole('region', { name: /articles à prendre/i })
  expect((await within(openItems).findAllByRole('heading', { level: 2 })).map((heading) => heading.textContent)).toEqual([
    'Fruits et légumes',
    'Frais',
    'Épicerie',
    'Bébé',
  ])

  await user.click(within(openItems).getByRole('checkbox', { name: /compotes/i }))

  expect(within(await screen.findByRole('region', { name: /^pris$/i })).getByText('Compotes')).toBeVisible()
  expect(within(openItems).queryByText('Compotes')).not.toBeInTheDocument()
})

it('shows an actionable error and preserves the item after a failed check', async () => {
  const user = userEvent.setup()
  const repository = withFault(createTestRepository(), 'updateShoppingItem')
  render(<App repository={repository} route="/courses" />)

  await user.click(await screen.findByRole('checkbox', { name: /lait/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/mettre à jour l’article/i)
  expect(screen.getByRole('region', { name: /articles à prendre/i })).toHaveTextContent('Lait')
  await user.click(screen.getByRole('button', { name: /fermer/i }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('adds an item inline and clears checked items only after confirmation', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  render(<App repository={repository} route="/courses" />)
  const itemName = await screen.findByLabelText(/nom de l’article/i)
  await user.type(itemName, 'Sacs poubelle')
  await user.click(screen.getByRole('button', { name: /^ajouter$/i }))
  expect(await screen.findByText('Sacs poubelle')).toBeVisible()

  await user.click(screen.getByRole('checkbox', { name: /sacs poubelle/i }))
  await user.click(screen.getByRole('button', { name: /vider les articles pris/i }))
  const confirmation = screen.getByRole('alertdialog', { name: /vider les articles pris/i })
  await user.click(within(confirmation).getByRole('button', { name: /annuler/i }))
  expect(await screen.findByText('Sacs poubelle')).toBeVisible()

  await user.click(screen.getByRole('button', { name: /vider les articles pris/i }))
  await user.click(
    within(screen.getByRole('alertdialog', { name: /vider les articles pris/i })).getByRole('button', {
      name: /^vider$/i,
    }),
  )

  expect(screen.queryByText('Sacs poubelle')).not.toBeInTheDocument()
  expect((await repository.listShoppingItems()).some((item) => item.name === 'Sacs poubelle')).toBe(false)
})

it('retries a partially failed bulk clear using only remaining checked items', async () => {
  const user = userEvent.setup()
  const base = createTestRepository()
  const first = await base.createShoppingItem({ name: 'Pris A', quantity: null, aisle: 'other', note: null, checkedAt: '2026-08-13T16:00:00.000Z' })
  const second = await base.createShoppingItem({ name: 'Pris B', quantity: null, aisle: 'other', note: null, checkedAt: '2026-08-13T16:00:00.000Z' })
  const repository = withFaultOnCall(base, 'removeShoppingItem', 2)
  render(<App repository={repository} route="/courses" />)
  await screen.findByText('Pris A')
  await user.click(screen.getByRole('button', { name: /vider les articles pris/i }))
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^vider$/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/vider les articles pris/i)
  expect((await base.listShoppingItems()).find((item) => item.id === first.id)).toBeUndefined()
  expect((await base.listShoppingItems()).find((item) => item.id === second.id)).toBeDefined()
  await user.click(screen.getByRole('button', { name: /réessayer/i }))

  expect((await base.listShoppingItems()).find((item) => item.id === second.id)).toBeUndefined()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('makes confirmation dialogs modal, traps focus, closes on Escape, and restores focus', async () => {
  const user = userEvent.setup()
  const repository = createTestRepository()
  render(<App repository={repository} route="/courses" />)
  await user.click(await screen.findByRole('checkbox', { name: /lait/i }))
  const opener = await screen.findByRole('button', { name: /vider les articles pris/i })
  await user.click(opener)

  const dialog = screen.getByRole('alertdialog', { name: /vider les articles pris/i })
  const cancel = within(dialog).getByRole('button', { name: /annuler/i })
  const clear = within(dialog).getByRole('button', { name: /^vider$/i })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(cancel).toHaveFocus()
  await user.tab({ shift: true })
  expect(clear).toHaveFocus()
  await user.tab()
  expect(cancel).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(dialog).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})
