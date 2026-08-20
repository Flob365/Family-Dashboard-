import { useState, type FormEvent } from 'react'
import type { CreateEntity } from '../../repositories/contracts'
import type { Event } from '../../types/domain'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ModalSheet } from '../../components/ModalSheet'

interface EventFormProps {
  event?: Event
  onCancel: () => void
  onDelete?: () => Promise<void>
  onSave: (input: CreateEntity<Event>) => Promise<void>
}

function localDateParts(timestamp: string) {
  const date = new Date(timestamp)
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` }
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function EventForm({ event, onCancel, onDelete, onSave }: EventFormProps) {
  const start = event === undefined ? { date: '', time: '' } : localDateParts(event.startsAt)
  const end = event?.endsAt === null || event?.endsAt === undefined ? null : localDateParts(event.endsAt)
  const reminder =
    event?.reminderAt === null || event?.reminderAt === undefined
      ? ''
      : `${localDateParts(event.reminderAt).date}T${localDateParts(event.reminderAt).time}`
  const [title, setTitle] = useState(event?.title ?? '')
  const [date, setDate] = useState(start.date)
  const [startsAt, setStartsAt] = useState(start.time)
  const [endsAt, setEndsAt] = useState(end?.time ?? '')
  const [owner, setOwner] = useState<Event['owner']>(event?.owner ?? 'family')
  const [category, setCategory] = useState<Event['category']>(event?.category ?? 'family')
  const [location, setLocation] = useState(event?.location ?? '')
  const [reminderAt, setReminderAt] = useState(reminder)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (title.trim() === '' || date === '' || startsAt === '') return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        startsAt: toIso(date, startsAt),
        endsAt: endsAt === '' ? null : toIso(date, endsAt),
        owner,
        category,
        location: location.trim() === '' ? null : location.trim(),
        reminderAt: reminderAt === '' ? null : new Date(reminderAt).toISOString(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalSheet labelId="event-form-title" onClose={onCancel}>
      <div className="module-form__header">
        <h2 id="event-form-title">{event === undefined ? 'Nouvel événement' : 'Modifier l’événement'}</h2>
        <button className="text-button" onClick={onCancel} type="button">
          Annuler
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="module-form__fields">
          <label className="form-field">
            Titre
            <input autoFocus data-autofocus required value={title} onChange={(change) => setTitle(change.target.value)} />
          </label>
          <div className="form-grid">
            <label className="form-field">
              Date
              <input required type="date" value={date} onChange={(change) => setDate(change.target.value)} />
            </label>
            <label className="form-field">
              Heure de début
              <input
                required
                type="time"
                value={startsAt}
                onChange={(change) => setStartsAt(change.target.value)}
              />
            </label>
            <label className="form-field">
              Heure de fin
              <input type="time" value={endsAt} onChange={(change) => setEndsAt(change.target.value)} />
            </label>
          </div>
          <div className="form-grid">
            <label className="form-field form-field--select">
              Pour qui
              <select value={owner} onChange={(change) => setOwner(change.target.value as Event['owner'])}>
                <option value="family">Toute la famille</option>
                <option value="florian">Florian</option>
                <option value="partner">Partenaire</option>
              </select>
            </label>
            <label className="form-field form-field--select">
              Catégorie
              <select
                value={category}
                onChange={(change) => setCategory(change.target.value as Event['category'])}
              >
                <option value="family">Famille</option>
                <option value="school">École</option>
                <option value="nursery">Crèche</option>
                <option value="health">Santé</option>
                <option value="personal">Personnel</option>
              </select>
            </label>
          </div>
          <label className="form-field">
            Lieu (facultatif)
            <input value={location} onChange={(change) => setLocation(change.target.value)} />
          </label>
          <label className="form-field">
            Rappel (facultatif)
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(change) => setReminderAt(change.target.value)}
            />
          </label>
        </div>
        <div className="module-form__footer">
          {event !== undefined && onDelete !== undefined ? (
            <button className="danger-button" onClick={() => setConfirmingDelete(true)} type="button">
              Supprimer
            </button>
          ) : (
            <span />
          )}
          <button className="primary-button" disabled={saving} type="submit">
            Enregistrer
          </button>
        </div>
      </form>
      {confirmingDelete ? (
        <ConfirmDialog
          confirmLabel="Supprimer"
          label="Supprimer l’événement"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => onDelete?.()}
        >
          Supprimer définitivement cet événement ?
        </ConfirmDialog>
      ) : null}
    </ModalSheet>
  )
}
