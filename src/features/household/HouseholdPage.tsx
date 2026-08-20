import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FamilyRepository } from '../../repositories/contracts'
import type { HouseholdTask, Owner, TaskPriority } from '../../types/domain'
import { TaskForm } from './TaskForm'
import { MutationErrorNotice } from '../../components/MutationErrorNotice'

interface HouseholdPageProps {
  repository: FamilyRepository
}

const ownerLabels: Record<Owner, string> = {
  family: 'Toute la famille',
  florian: 'Florian',
  partner: 'Partenaire',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
}

const dueFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

export function HouseholdPage({ repository }: HouseholdPageProps) {
  const [tasks, setTasks] = useState<HouseholdTask[]>([])
  const [ownerFilter, setOwnerFilter] = useState<'all' | Owner>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'undated'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<{ message: string; retry: () => void } | null>(null)
  const completingIds = useRef(new Set<string>())

  const loadTasks = useCallback(async () => {
    try {
      setTasks(await repository.listTasks())
      setError(null)
    } catch {
      setError('Impossible de charger les tâches de la maison.')
    }
  }, [repository])

  useEffect(() => {
    void loadTasks()
    return repository.subscribe(() => void loadTasks())
  }, [loadTasks, repository])

  async function completeTask(task: HouseholdTask) {
    if (task.completedAt !== null || completingIds.current.has(task.id)) return
    completingIds.current.add(task.id)
    const completedAt = new Date()
    try {
      await repository.completeTaskOccurrence(task.id, completedAt.toISOString())
      setMutationError(null)
      await loadTasks()
    } catch {
      setMutationError({ message: 'Impossible de terminer la tâche.', retry: () => void completeTask(task) })
    } finally {
      completingIds.current.delete(task.id)
    }
  }

  async function createTask(input: Parameters<FamilyRepository['createTask']>[0]) {
    try {
      await repository.createTask(input)
      setMutationError(null)
      setAdding(false)
      await loadTasks()
    } catch {
      setMutationError({ message: 'Impossible d’enregistrer la tâche.', retry: () => void createTask(input) })
    }
  }

  const openTasks = tasks
    .filter((task) => task.completedAt === null)
    .filter((task) => ownerFilter === 'all' || task.owner === ownerFilter)
    .filter((task) => priorityFilter === 'all' || task.priority === priorityFilter)
    .filter((task) => {
      if (dateFilter === 'all') return true
      if (dateFilter === 'undated') return task.dueAt === null
      if (task.dueAt === null) return false
      const dueDate = new Date(task.dueAt)
      const today = new Date()
      const isToday = dueDate.toDateString() === today.toDateString()
      return dateFilter === 'today' ? isToday : dueDate > today && !isToday
    })
    .sort((left, right) => (left.dueAt ?? '9999').localeCompare(right.dueAt ?? '9999'))
  const completedTasks = tasks.filter((task) => task.completedAt !== null)

  return (
    <section aria-labelledby="household-title" className="module-page">
      <header className="module-page__header">
        <div>
          <h1 id="household-title">Maison</h1>
          <p>Les tâches partagées, sans surcharge</p>
        </div>
        <button className="primary-action" onClick={() => setAdding(true)} type="button">
          <Plus aria-hidden="true" />
          Ajouter une tâche
        </button>
      </header>

      <div aria-label="Filtres des tâches" className="filter-bar">
        <label className="form-field form-field--select">
          Filtrer par personne
          <select value={ownerFilter} onChange={(change) => setOwnerFilter(change.target.value as 'all' | Owner)}>
            <option value="all">Tout le monde</option>
            <option value="family">Toute la famille</option>
            <option value="florian">Florian</option>
            <option value="partner">Partenaire</option>
          </select>
        </label>
        <label className="form-field form-field--select">
          Filtrer par date
          <select
            value={dateFilter}
            onChange={(change) => setDateFilter(change.target.value as typeof dateFilter)}
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd’hui</option>
            <option value="upcoming">À venir</option>
            <option value="undated">Sans date</option>
          </select>
        </label>
        <label className="form-field form-field--select">
          Filtrer par priorité
          <select
            value={priorityFilter}
            onChange={(change) => setPriorityFilter(change.target.value as 'all' | TaskPriority)}
          >
            <option value="all">Toutes les priorités</option>
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
          </select>
        </label>
      </div>

      {error === null ? null : <p role="alert">{error}</p>}
      {mutationError === null ? null : (
        <MutationErrorNotice
          message={mutationError.message}
          onClose={() => setMutationError(null)}
          onRetry={mutationError.retry}
        />
      )}

      <section aria-label="À faire" className="list-group" role="region">
        <h2>À faire</h2>
        {openTasks.length === 0 ? <p className="empty-copy">Aucune tâche pour ces filtres.</p> : null}
        <ul className="check-list">
          {openTasks.map((task) => (
            <li className="check-row task-row" key={task.id}>
              <label>
                <input onChange={() => void completeTask(task)} type="checkbox" />
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {ownerLabels[task.owner]} · Priorité {priorityLabels[task.priority].toLowerCase()}
                    {task.dueAt === null ? '' : ` · ${dueFormatter.format(new Date(task.dueAt))}`}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Terminées" className="completed-section" role="region">
        <details open={completedTasks.length > 0}>
          <summary>Terminées ({completedTasks.length})</summary>
          <ul className="check-list">
            {completedTasks.map((task) => (
              <li className="check-row is-completed" key={task.id}>
                <label>
                  <input checked disabled type="checkbox" />
                  <span>
                    <strong>{task.title}</strong>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {adding ? <TaskForm onCancel={() => setAdding(false)} onSave={createTask} /> : null}
    </section>
  )
}
