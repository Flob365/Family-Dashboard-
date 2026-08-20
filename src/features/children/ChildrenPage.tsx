import { Pencil, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { CreateEntity, FamilyRepository } from '../../repositories/contracts'
import type { ChildItem, ChildItemKind, ChildSpace, Event } from '../../types/domain'
import { ChildItemForm } from './ChildItemForm'
import { MutationErrorNotice } from '../../components/MutationErrorNotice'

interface ChildrenPageProps {
  repository: FamilyRepository
  space: ChildSpace
}

const sectionLabels: Record<ChildItemKind, string> = {
  event: 'À venir',
  bring: 'À apporter',
  information: 'Informations',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

function calendarInput(item: CreateEntity<ChildItem>): CreateEntity<Event> | null {
  if (item.kind !== 'event' || item.scheduledAt === null) return null
  return {
    title: item.title,
    startsAt: item.scheduledAt,
    endsAt: null,
    location: null,
    category: item.space === 'school' ? 'school' : 'nursery',
    owner: item.owner,
    reminderAt: null,
  }
}

function eventInput(event: Event): CreateEntity<Event> {
  return {
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    category: event.category,
    owner: event.owner,
    reminderAt: event.reminderAt,
  }
}

export function ChildrenPage({ repository, space }: ChildrenPageProps) {
  const [items, setItems] = useState<ChildItem[]>([])
  const [form, setForm] = useState<{ kind: ChildItemKind; item?: ChildItem } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<{ message: string; retry: () => void } | null>(null)

  const loadItems = useCallback(async () => {
    try {
      setItems(await repository.listChildItems())
      setError(null)
    } catch {
      setError('Impossible de charger l’espace enfants.')
    }
  }, [repository])

  useEffect(() => {
    setForm(null)
    void loadItems()
    return repository.subscribe(() => void loadItems())
  }, [loadItems, repository, space])

  async function saveItem(input: CreateEntity<ChildItem>) {
    try {
      const linkedInput = calendarInput(input)
      if (form?.item === undefined) {
        if (linkedInput === null) {
          await repository.createChildItem({ ...input, linkedEventId: null })
        } else {
          const event = await repository.createEvent(linkedInput)
          try {
            await repository.createChildItem({ ...input, linkedEventId: event.id })
          } catch (error) {
            await repository.removeEvent(event.id)
            throw error
          }
        }
      } else {
        await updateItem(form.item, input, linkedInput)
      }
      setMutationError(null)
      setForm(null)
      await loadItems()
    } catch {
      setMutationError({ message: 'Impossible d’enregistrer l’élément.', retry: () => void saveItem(input) })
    }
  }

  async function updateItem(
    previous: ChildItem,
    input: CreateEntity<ChildItem>,
    linkedInput: CreateEntity<Event> | null,
  ) {
    if (linkedInput === null) {
      await repository.updateChildItem(previous.id, { ...input, linkedEventId: null })
      return
    }
    const previousEvent = previous.linkedEventId === null
      ? undefined
      : (await repository.listEvents()).find((event) => event.id === previous.linkedEventId)
    if (previousEvent === undefined) {
      const createdEvent = await repository.createEvent(linkedInput)
      try {
        await repository.updateChildItem(previous.id, { ...input, linkedEventId: createdEvent.id })
      } catch (error) {
        await repository.removeEvent(createdEvent.id)
        throw error
      }
      return
    }
    await repository.updateEvent(previousEvent.id, linkedInput)
    try {
      await repository.updateChildItem(previous.id, { ...input, linkedEventId: previousEvent.id })
    } catch (error) {
      await repository.updateEvent(previousEvent.id, eventInput(previousEvent))
      throw error
    }
  }

  async function deleteItem(itemId: string) {
    try {
      const item = (await repository.listChildItems()).find((candidate) => candidate.id === itemId)
      if (item === undefined) {
        setMutationError(null)
        setForm(null)
        await loadItems()
        return
      }
      if (item.linkedEventId === null) {
        await repository.removeChildItem(item.id)
      } else {
        const linkedEvent = (await repository.listEvents()).find((event) => event.id === item.linkedEventId)
        if (linkedEvent === undefined) {
          await repository.removeChildItem(item.id)
        } else {
          await repository.removeEvent(linkedEvent.id)
          try {
            await repository.removeChildItem(item.id)
          } catch (error) {
            const restoredEvent = await repository.createEvent(eventInput(linkedEvent))
            await repository.updateChildItem(item.id, { linkedEventId: restoredEvent.id })
            throw error
          }
        }
      }
      setMutationError(null)
      setForm(null)
      await loadItems()
    } catch {
      setMutationError({ message: 'Impossible de supprimer l’élément.', retry: () => void deleteItem(itemId) })
    }
  }

  const spaceItems = items
    .filter((item) => item.space === space)
    .sort((left, right) => (left.scheduledAt ?? '9999').localeCompare(right.scheduledAt ?? '9999'))
  const editingItem = form?.item

  return (
    <section aria-labelledby="children-title" className="module-page">
      <header className="module-page__header">
        <div>
          <h1 id="children-title">Enfants</h1>
          <p>École, crèche et petites choses à ne pas oublier</p>
        </div>
      </header>

      <nav aria-label="Espaces enfants" className="child-tabs">
        <NavLink to="/enfants/ecole">
          École
        </NavLink>
        <NavLink to="/enfants/creche">
          Crèche
        </NavLink>
      </nav>

      {error === null ? null : <p role="alert">{error}</p>}
      {mutationError === null ? null : (
        <MutationErrorNotice
          message={mutationError.message}
          onClose={() => setMutationError(null)}
          onRetry={mutationError.retry}
        />
      )}

      <div className="child-sections">
        {(['event', 'bring', 'information'] as ChildItemKind[]).map((kind) => {
          const sectionItems = spaceItems.filter((item) => item.kind === kind)
          return (
            <section aria-label={sectionLabels[kind]} className="list-group child-section" key={kind} role="region">
              <div className="section-heading">
                <h2>{sectionLabels[kind]}</h2>
                <button className="text-button" onClick={() => setForm({ kind })} type="button">
                  <Plus aria-hidden="true" /> Ajouter
                </button>
              </div>
              {sectionItems.length === 0 ? <p className="empty-copy">Rien pour le moment.</p> : null}
              <ul className="module-list child-list">
                {sectionItems.map((item) => (
                  <li className="module-row child-row" key={item.id}>
                    <div className="module-row__body">
                      <strong>{item.title}</strong>
                      {item.scheduledAt === null ? null : (
                        <time dateTime={item.scheduledAt}>{dateFormatter.format(new Date(item.scheduledAt))}</time>
                      )}
                      {item.note === null ? null : <span>{item.note}</span>}
                    </div>
                    <button
                      aria-label={`Modifier ${item.title}`}
                      className="icon-button"
                      onClick={() => setForm({ kind: item.kind, item })}
                      type="button"
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {form === null ? null : (
        <ChildItemForm
          item={editingItem}
          kind={form.kind}
          onCancel={() => setForm(null)}
          onDelete={editingItem === undefined ? undefined : () => deleteItem(editingItem.id)}
          onSave={saveItem}
          space={space}
        />
      )}
    </section>
  )
}
