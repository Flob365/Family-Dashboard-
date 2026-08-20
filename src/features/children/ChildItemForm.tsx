import { useState, type FormEvent } from 'react'
import type { CreateEntity } from '../../repositories/contracts'
import type { ChildItem, ChildItemKind, ChildSpace } from '../../types/domain'
import { ModalSheet } from '../../components/ModalSheet'

interface ChildItemFormProps {
  item?: ChildItem
  kind: ChildItemKind
  space: ChildSpace
  onCancel: () => void
  onDelete?: () => Promise<void>
  onSave: (input: CreateEntity<ChildItem>) => Promise<void>
}

function dateParts(timestamp: string | null) {
  if (timestamp === null) return { date: '', time: '' }
  const value = new Date(timestamp)
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
    time: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`,
  }
}

const formTitles: Record<ChildItemKind, string> = {
  event: 'Nouvel événement',
  bring: 'Nouvel élément à apporter',
  information: 'Nouvelle information',
}

export function ChildItemForm({ item, kind, space, onCancel, onDelete, onSave }: ChildItemFormProps) {
  const schedule = dateParts(item?.scheduledAt ?? null)
  const [title, setTitle] = useState(item?.title ?? '')
  const [date, setDate] = useState(schedule.date)
  const [time, setTime] = useState(schedule.time)
  const [owner, setOwner] = useState<ChildItem['owner']>(item?.owner ?? 'family')
  const [note, setNote] = useState(item?.note ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (title.trim() === '' || (kind === 'event' && (date === '' || time === ''))) return
    setSaving(true)
    try {
      const scheduledAt =
        kind === 'information' || date === ''
          ? null
          : new Date(`${date}T${time === '' ? '12:00' : time}:00`).toISOString()
      await onSave({
        kind,
        space,
        title: title.trim(),
        scheduledAt,
        note: note.trim() === '' ? null : note.trim(),
        owner,
        status: item?.status ?? 'pending',
        linkedEventId: item?.linkedEventId ?? null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalSheet labelId="child-form-title" onClose={onCancel}>
      <div className="module-form__header">
        <h2 id="child-form-title">{item === undefined ? formTitles[kind] : 'Modifier l’élément'}</h2>
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
          {kind === 'information' ? null : (
            <div className="form-grid">
              <label className="form-field">
                Date
                <input
                  required={kind === 'event'}
                  type="date"
                  value={date}
                  onChange={(change) => setDate(change.target.value)}
                />
              </label>
              <label className="form-field">
                Heure
                <input
                  required={kind === 'event'}
                  type="time"
                  value={time}
                  onChange={(change) => setTime(change.target.value)}
                />
              </label>
            </div>
          )}
          <label className="form-field form-field--select">
            Pour qui
            <select value={owner} onChange={(change) => setOwner(change.target.value as ChildItem['owner'])}>
              <option value="family">Toute la famille</option>
              <option value="florian">Florian</option>
              <option value="partner">Partenaire</option>
            </select>
          </label>
          <label className="form-field">
            Note (facultatif)
            <input value={note} onChange={(change) => setNote(change.target.value)} />
          </label>
        </div>
        <div className="module-form__footer">
          {onDelete === undefined ? <span /> : (
            <button className="danger-button" onClick={() => void onDelete()} type="button">Supprimer</button>
          )}
          <button className="primary-button" disabled={saving} type="submit">
            Enregistrer
          </button>
        </div>
      </form>
    </ModalSheet>
  )
}
