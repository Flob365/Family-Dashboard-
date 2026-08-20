import { CalendarPlus, MapPin, Pencil } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FamilyRepository } from '../../repositories/contracts'
import type { Event } from '../../types/domain'
import { EventForm } from './EventForm'
import { MutationErrorNotice } from '../../components/MutationErrorNotice'

interface CalendarPageProps {
  repository: FamilyRepository
}

const owners: Record<Event['owner'], string> = {
  family: 'Toute la famille',
  florian: 'Florian',
  partner: 'Partenaire',
}

const categories: Record<Event['category'], string> = {
  family: 'Famille',
  school: 'École',
  nursery: 'Crèche',
  health: 'Santé',
  personal: 'Personnel',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const compactDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function CalendarPage({ repository }: CalendarPageProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [view, setView] = useState<'list' | 'week'>('list')
  const [editing, setEditing] = useState<Event | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<{ message: string; retry: () => void } | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const nextEvents = await repository.listEvents()
      setEvents(nextEvents.sort((left, right) => left.startsAt.localeCompare(right.startsAt)))
      setError(null)
    } catch {
      setError('Impossible de charger l’agenda.')
    }
  }, [repository])

  useEffect(() => {
    void loadEvents()
    return repository.subscribe(() => void loadEvents())
  }, [loadEvents, repository])

  async function saveEvent(input: Parameters<FamilyRepository['createEvent']>[0]) {
    try {
      if (editing === 'new') await repository.createEvent(input)
      else if (editing !== null) await repository.updateEvent(editing.id, input)
      setMutationError(null)
      setEditing(null)
      await loadEvents()
    } catch {
      setMutationError({ message: 'Impossible d’enregistrer l’événement.', retry: () => void saveEvent(input) })
    }
  }

  async function deleteEvent() {
    if (editing === null || editing === 'new') return
    const event = editing
    try {
      await repository.removeEvent(event.id)
      setMutationError(null)
      setEditing(null)
      await loadEvents()
    } catch {
      setMutationError({ message: 'Impossible de supprimer l’événement.', retry: () => void deleteEvent() })
    }
  }

  return (
    <section aria-labelledby="calendar-title" className="module-page">
      <header className="module-page__header">
        <div>
          <h1 id="calendar-title">Agenda</h1>
          <p>Les rendez-vous de toute la famille</p>
        </div>
        <button className="primary-action" onClick={() => setEditing('new')} type="button">
          <CalendarPlus aria-hidden="true" />
          Ajouter un événement
        </button>
      </header>

      <div aria-label="Affichage de l’agenda" className="segmented-control">
        <button aria-pressed={view === 'list'} onClick={() => setView('list')} type="button">
          Liste
        </button>
        <button aria-pressed={view === 'week'} onClick={() => setView('week')} type="button">
          Semaine
        </button>
      </div>

      {error === null ? null : <p role="alert">{error}</p>}
      {mutationError === null ? null : (
        <MutationErrorNotice
          message={mutationError.message}
          onClose={() => setMutationError(null)}
          onRetry={mutationError.retry}
        />
      )}

      {view === 'list' ? (
        <div aria-label="Liste chronologique" className="module-list" role="region">
          {events.length === 0 ? <p className="empty-copy">Aucun événement prévu.</p> : null}
          {events.map((event) => (
            <article className="module-row calendar-row" key={event.id}>
              <time dateTime={event.startsAt}>
                <strong>{dateFormatter.format(new Date(event.startsAt))}</strong>
                <span>{timeFormatter.format(new Date(event.startsAt))}</span>
              </time>
              <div className="module-row__body">
                <strong>{event.title}</strong>
                <span>
                  {owners[event.owner]} · {categories[event.category]}
                </span>
                {event.location === null ? null : (
                  <span>
                    <MapPin aria-hidden="true" /> {event.location}
                  </span>
                )}
              </div>
              <button
                aria-label={`Modifier ${event.title}`}
                className="icon-button"
                onClick={() => setEditing(event)}
                type="button"
              >
                <Pencil aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div aria-label="Semaine" className="week-grid" role="region">
          {Array.from({ length: 7 }, (_, index) => {
            const date = new Date()
            date.setHours(0, 0, 0, 0)
            date.setDate(date.getDate() + index)
            const dayEvents = events.filter((event) => {
              const eventDate = new Date(event.startsAt)
              return eventDate.toDateString() === date.toDateString()
            })
            return (
              <section key={date.toISOString()}>
                <h2>{compactDateFormatter.format(date)}</h2>
                {dayEvents.length === 0 ? <span className="week-grid__empty">—</span> : null}
                {dayEvents.map((event) => (
                  <p key={event.id}>
                    <time dateTime={event.startsAt}>{timeFormatter.format(new Date(event.startsAt))}</time>{' '}
                    {event.title}
                  </p>
                ))}
              </section>
            )
          })}
        </div>
      )}

      {editing === null ? null : (
        <EventForm
          event={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onDelete={editing === 'new' ? undefined : deleteEvent}
          onSave={saveEvent}
        />
      )}
    </section>
  )
}
