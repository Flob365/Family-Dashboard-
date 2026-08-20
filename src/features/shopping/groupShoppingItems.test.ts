import { expect, it } from 'vitest'
import type { ShoppingAisle, ShoppingItem } from '../../types/domain'
import { groupShoppingItems } from './groupShoppingItems'

function shoppingItem(
  id: string,
  aisle: ShoppingAisle,
  checkedAt: string | null = null,
): ShoppingItem {
  return {
    id,
    householdId: 'household-1',
    createdBy: 'user-1',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    name: id,
    quantity: null,
    aisle,
    note: null,
    checkedAt,
  }
}

it('returns non-empty active groups in the fixed aisle order', () => {
  const groups = groupShoppingItems([
    shoppingItem('nappies', 'baby'),
    shoppingItem('apples', 'produce'),
    shoppingItem('milk', 'fresh'),
  ])

  expect(groups.map((group) => group.aisle)).toEqual(['produce', 'fresh', 'baby'])
})

it('excludes checked items from active groups', () => {
  const groups = groupShoppingItems([
    shoppingItem('apples', 'produce'),
    shoppingItem('bananas', 'produce', '2026-08-13T10:00:00+02:00'),
  ])

  expect(groups).toHaveLength(1)
  expect(groups[0]?.items.map((item) => item.id)).toEqual(['apples'])
})

it('keeps the input order of items inside each aisle', () => {
  const groups = groupShoppingItems([
    shoppingItem('tomatoes', 'produce'),
    shoppingItem('pears', 'produce'),
  ])

  expect(groups[0]?.items.map((item) => item.id)).toEqual(['tomatoes', 'pears'])
})
