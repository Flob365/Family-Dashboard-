import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  ShoppingBag,
  X,
} from 'lucide-react'
import type { Owner, ShoppingAisle } from '../types/domain'
import { IconButton } from './IconButton'

export type QuickAddPayload =
  | { kind: 'event'; title: string; startsAt: string; owner: Owner }
  | { kind: 'task'; title: string; dueAt: string | null; owner: Owner }
  | { kind: 'shopping'; name: string; aisle: ShoppingAisle; quantity: string | null }

type QuickAddKind = QuickAddPayload['kind']

interface AddSheetProps {
  kind: QuickAddKind
  now: Date
  onDismiss: () => void
  onKindChange: (kind: QuickAddKind) => void
  onSubmit: (payload: QuickAddPayload) => Promise<void>
  open: boolean
  presetTitle?: string
}

const tabs = [
  { kind: 'event' as const, label: 'Événement', icon: CalendarDays },
  { kind: 'task' as const, label: 'Tâche', icon: ClipboardCheck },
  { kind: 'shopping' as const, label: 'Article', icon: ShoppingBag },
]

const PARIS_TIME_ZONE = 'Europe/Paris'

function parisOffsetAt(instant: Date) {
  const offsetName = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TIME_ZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offsetName ?? '')
  if (match === null) throw new Error('Unable to resolve Europe/Paris offset')

  const direction = match[1] === '+' ? 1 : -1
  return direction * (Number(match[2]) * 60 + Number(match[3])) * 60_000
}

function parisDateValue(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function localIsoForDate(date: string, time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const wallClockUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hour,
    minute,
  )
  const firstOffset = parisOffsetAt(new Date(wallClockUtc))
  const firstInstant = new Date(wallClockUtc - firstOffset)
  const resolvedOffset = parisOffsetAt(firstInstant)
  return new Date(wallClockUtc - resolvedOffset).toISOString()
}

function localIsoForDay(now: Date, time: string) {
  return localIsoForDate(parisDateValue(now), time)
}

export function AddSheet({
  kind,
  now,
  onDismiss,
  onKindChange,
  onSubmit,
  open,
  presetTitle = '',
}: AddSheetProps) {
  const [title, setTitle] = useState(presetTitle)
  const [date, setDate] = useState(() => parisDateValue(now))
  const [time, setTime] = useState('12:30')
  const [owner, setOwner] = useState<Owner>('family')
  const [invalid, setInvalid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) setInvalid(false)
  }, [open])

  useEffect(() => {
    if (!open) return

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    titleRef.current?.focus()
    const opener = openerRef.current
    return () => opener?.focus()
  }, [open])

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onDismiss()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable === undefined || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  function selectKind(nextKind: QuickAddKind) {
    onKindChange(nextKind)
    setTitle('')
    setInvalid(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (cleanTitle.length === 0) {
      setInvalid(true)
      titleRef.current?.focus()
      return
    }
    if (kind === 'event' && (date === '' || time === '')) return

    const payload: QuickAddPayload =
      kind === 'event'
        ? { kind, title: cleanTitle, startsAt: localIsoForDate(date, time), owner }
        : kind === 'task'
          ? { kind, title: cleanTitle, dueAt: localIsoForDay(now, '18:00'), owner }
          : { kind, name: cleanTitle, aisle: 'other', quantity: null }

    setSubmitting(true)
    try {
      await onSubmit(payload)
      setTitle('')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      <button className="add-sheet__backdrop" aria-label="Fermer" onClick={onDismiss} type="button" />
      <section
        aria-labelledby="add-sheet-title"
        aria-modal="true"
        className="add-sheet"
        data-open="true"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <header className="add-sheet__header">
          <h2 id="add-sheet-title">Ajouter</h2>
          <IconButton className="add-sheet__close" label="Fermer" onClick={onDismiss}>
            <X aria-hidden="true" />
          </IconButton>
        </header>

        <form className="add-sheet__form" noValidate onSubmit={submit}>
          <div aria-label="Type d’ajout" className="add-sheet__tabs" role="tablist">
            {tabs.map(({ icon: Icon, kind: tabKind, label }) => (
              <button
                aria-selected={kind === tabKind}
                className="add-sheet__tab"
                key={tabKind}
                onClick={() => selectKind(tabKind)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="add-sheet__fields">
            <label className="form-field">
              <span>{kind === 'shopping' ? 'Article' : 'Titre'}</span>
              <input
                aria-invalid={invalid}
                autoComplete="off"
                onChange={(event) => {
                  setTitle(event.target.value)
                  if (event.target.value.trim().length > 0) setInvalid(false)
                }}
                ref={titleRef}
                required
                value={title}
              />
            </label>

            {kind === 'event' ? (
              <>
                <label className="form-field form-field--icon">
                  <span>Date</span>
                  <input
                    aria-label="Date"
                    onChange={(event) => setDate(event.target.value)}
                    onInput={(event) => setDate(event.currentTarget.value)}
                    required
                    type="date"
                    value={date}
                  />
                  <CalendarDays aria-hidden="true" />
                </label>
                <label className="form-field form-field--icon">
                  <span>Heure</span>
                  <input
                    aria-label="Heure"
                    onChange={(event) => setTime(event.target.value)}
                    onInput={(event) => setTime(event.currentTarget.value)}
                    required
                    step="60"
                    type="time"
                    value={time}
                  />
                  <Clock3 aria-hidden="true" />
                </label>
                <label className="form-field form-field--select">
                  <span>Responsable</span>
                  <select onChange={(event) => setOwner(event.target.value as Owner)} value={owner}>
                    <option value="family">Famille</option>
                    <option value="florian">Florian</option>
                    <option value="partner">Partenaire</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
              </>
            ) : null}

            <details className="add-sheet__details">
              <summary>
                <ChevronDown aria-hidden="true" />
                <span>Plus de détails</span>
              </summary>
            </details>
          </div>

          <footer className="add-sheet__footer">
            <button className="secondary-button" onClick={onDismiss} type="button">
              Annuler
            </button>
            <button className="primary-button" disabled={submitting} type="submit">
              Ajouter
            </button>
          </footer>
        </form>
      </section>
    </>
  )
}
