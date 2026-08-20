import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { FamilyRepository } from '../../repositories/contracts'
import type { ShoppingAisle, ShoppingItem } from '../../types/domain'
import { groupShoppingItems } from './groupShoppingItems'
import { ShoppingItemRow } from './ShoppingItemRow'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { MutationErrorNotice } from '../../components/MutationErrorNotice'

interface ShoppingPageProps {
  repository: FamilyRepository
}

const aisleLabels: Record<ShoppingAisle, string> = {
  produce: 'Fruits et légumes',
  fresh: 'Frais',
  grocery: 'Épicerie',
  home: 'Maison',
  baby: 'Bébé',
  other: 'Autres',
}

export function ShoppingPage({ repository }: ShoppingPageProps) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [name, setName] = useState('')
  const [aisle, setAisle] = useState<ShoppingAisle>('other')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<{ message: string; retry?: () => void } | null>(null)

  const loadItems = useCallback(async () => {
    try {
      setItems(await repository.listShoppingItems())
      setError(null)
    } catch {
      setError('Impossible de charger la liste de courses.')
    }
  }, [repository])

  useEffect(() => {
    void loadItems()
    return repository.subscribe(() => void loadItems())
  }, [loadItems, repository])

  async function addItem(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (name.trim() === '') return
    const input = {
      name: name.trim(),
      aisle,
      quantity: null,
      note: null,
      checkedAt: null,
    } as const
    try {
      await repository.createShoppingItem(input)
      setMutationError(null)
      setName('')
      setAisle('other')
      await loadItems()
    } catch {
      setMutationError({ message: 'Impossible d’ajouter l’article.', retry: () => void retryAdd(input) })
    }
  }

  async function retryAdd(input: Parameters<FamilyRepository['createShoppingItem']>[0]) {
    try {
      await repository.createShoppingItem(input)
      setMutationError(null)
      setName('')
      setAisle('other')
      await loadItems()
    } catch {
      setMutationError({ message: 'Impossible d’ajouter l’article.', retry: () => void retryAdd(input) })
    }
  }

  async function toggleItem(item: ShoppingItem) {
    try {
      await repository.updateShoppingItem(item.id, {
        checkedAt: item.checkedAt === null ? new Date().toISOString() : null,
      })
      setMutationError(null)
      await loadItems()
    } catch {
      setMutationError({ message: 'Impossible de mettre à jour l’article.', retry: () => void toggleItem(item) })
    }
  }

  async function clearChecked() {
    try {
      const currentCheckedItems = (await repository.listShoppingItems()).filter((item) => item.checkedAt !== null)
      let removalFailed = false
      for (const item of currentCheckedItems) {
        try {
          await repository.removeShoppingItem(item.id)
        } catch {
          removalFailed = true
        }
      }
      setConfirmingClear(false)
      await loadItems()
      if (removalFailed) {
        setMutationError({ message: 'Impossible de vider les articles pris.', retry: () => void clearChecked() })
        return
      }
      setMutationError(null)
    } catch {
      setConfirmingClear(false)
      await loadItems()
      setMutationError({ message: 'Impossible de vider les articles pris.', retry: () => void clearChecked() })
    }
  }

  const openItems = items.filter((item) => item.checkedAt === null)
  const checkedItems = items.filter((item) => item.checkedAt !== null)
  const groups = groupShoppingItems(openItems)

  return (
    <section aria-labelledby="shopping-title" className="module-page">
      <header className="module-page__header">
        <div>
          <h1 id="shopping-title">Courses</h1>
          <p>{openItems.length} article{openItems.length > 1 ? 's' : ''} à prendre</p>
        </div>
      </header>

      <form className="inline-add" onSubmit={addItem}>
        <label className="form-field inline-add__name">
          Nom de l’article
          <input
            autoComplete="off"
            placeholder="Ajouter à la liste"
            value={name}
            onChange={(change) => setName(change.target.value)}
          />
        </label>
        <label className="form-field form-field--select">
          Rayon
          <select value={aisle} onChange={(change) => setAisle(change.target.value as ShoppingAisle)}>
            {Object.entries(aisleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-action" type="submit">
          <Plus aria-hidden="true" />
          Ajouter
        </button>
      </form>

      {error === null ? null : <p role="alert">{error}</p>}
      {mutationError === null ? null : (
        <MutationErrorNotice
          message={mutationError.message}
          onClose={() => setMutationError(null)}
          onRetry={mutationError.retry}
        />
      )}

      <div aria-label="Articles à prendre" className="grouped-list" role="region">
        {groups.length === 0 ? <p className="empty-copy">La liste est vide.</p> : null}
        {groups.map((group) => (
          <section className="list-group" key={group.aisle}>
            <h2>{aisleLabels[group.aisle]}</h2>
            <ul className="check-list">
              {group.items.map((item) => (
                <ShoppingItemRow item={item} key={item.id} onToggle={toggleItem} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section aria-label="Pris" className="completed-section" role="region">
        <details open={checkedItems.length > 0}>
          <summary>Pris ({checkedItems.length})</summary>
          <ul className="check-list">
            {checkedItems.map((item) => (
              <ShoppingItemRow item={item} key={item.id} onToggle={toggleItem} />
            ))}
          </ul>
          {checkedItems.length === 0 ? null : (
            <button className="text-button text-button--danger" onClick={() => setConfirmingClear(true)} type="button">
              <Trash2 aria-hidden="true" />
              Vider les articles pris
            </button>
          )}
        </details>
      </section>

      {confirmingClear ? (
        <ConfirmDialog
          confirmLabel="Vider"
          label="Vider les articles pris"
          onCancel={() => setConfirmingClear(false)}
          onConfirm={clearChecked}
        >
          Retirer définitivement tous les articles pris ?
        </ConfirmDialog>
      ) : null}
    </section>
  )
}
