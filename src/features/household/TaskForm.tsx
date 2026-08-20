import { useState, type FormEvent } from 'react'
import type { CreateEntity } from '../../repositories/contracts'
import type { HouseholdTask } from '../../types/domain'
import { ModalSheet } from '../../components/ModalSheet'

interface TaskFormProps {
  onCancel: () => void
  onSave: (input: CreateEntity<HouseholdTask>) => Promise<void>
}

export function TaskForm({ onCancel, onSave }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState<HouseholdTask['owner']>('family')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<HouseholdTask['priority']>('normal')
  const [recurrenceUnit, setRecurrenceUnit] = useState<'none' | 'day' | 'week' | 'month'>('none')
  const [interval, setInterval] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (title.trim() === '') return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        owner,
        dueAt: dueDate === '' ? null : new Date(`${dueDate}T12:00:00`).toISOString(),
        priority,
        recurrence:
          recurrenceUnit === 'none'
            ? null
            : { unit: recurrenceUnit, interval: Math.max(1, Number(interval) || 1) },
        completedAt: null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalSheet labelId="task-form-title" onClose={onCancel}>
      <div className="module-form__header">
        <h2 id="task-form-title">Nouvelle tâche</h2>
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
            <label className="form-field form-field--select">
              Pour qui
              <select
                value={owner}
                onChange={(change) => setOwner(change.target.value as HouseholdTask['owner'])}
              >
                <option value="family">Toute la famille</option>
                <option value="florian">Florian</option>
                <option value="partner">Partenaire</option>
              </select>
            </label>
            <label className="form-field">
              Date
              <input type="date" value={dueDate} onChange={(change) => setDueDate(change.target.value)} />
            </label>
            <label className="form-field form-field--select">
              Priorité
              <select
                value={priority}
                onChange={(change) => setPriority(change.target.value as HouseholdTask['priority'])}
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label className="form-field form-field--select">
              Récurrence
              <select
                value={recurrenceUnit}
                onChange={(change) =>
                  setRecurrenceUnit(change.target.value as 'none' | 'day' | 'week' | 'month')
                }
              >
                <option value="none">Aucune</option>
                <option value="day">Chaque jour</option>
                <option value="week">Chaque semaine</option>
                <option value="month">Chaque mois</option>
              </select>
            </label>
            {recurrenceUnit === 'none' ? null : (
              <label className="form-field">
                Toutes les
                <input
                  inputMode="numeric"
                  min="1"
                  required
                  type="number"
                  value={interval}
                  onChange={(change) => setInterval(change.target.value)}
                />
              </label>
            )}
          </div>
        </div>
        <div className="module-form__footer module-form__footer--end">
          <button className="primary-button" disabled={saving} type="submit">
            Enregistrer
          </button>
        </div>
      </form>
    </ModalSheet>
  )
}
