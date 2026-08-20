import type { ShoppingItem } from '../../types/domain'

interface ShoppingItemRowProps {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => Promise<void>
}

export function ShoppingItemRow({ item, onToggle }: ShoppingItemRowProps) {
  return (
    <li className="check-row">
      <label>
        <input
          checked={item.checkedAt !== null}
          onChange={() => void onToggle(item)}
          type="checkbox"
        />
        <span>
          <strong>{item.name}</strong>
          {item.quantity === null ? null : <small>{item.quantity}</small>}
        </span>
      </label>
    </li>
  )
}
