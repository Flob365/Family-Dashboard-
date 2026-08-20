import type { ShoppingAisle, ShoppingItem } from '../../types/domain'

const aisleOrder: ShoppingAisle[] = ['produce', 'fresh', 'grocery', 'home', 'baby', 'other']

export interface ShoppingGroup {
  aisle: ShoppingAisle
  items: ShoppingItem[]
}

export function groupShoppingItems(items: ShoppingItem[]): ShoppingGroup[] {
  return aisleOrder.flatMap((aisle) => {
    const activeItems = items.filter((item) => item.aisle === aisle && item.checkedAt === null)
    return activeItems.length === 0 ? [] : [{ aisle, items: activeItems }]
  })
}
