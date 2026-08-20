import { Baby, Backpack, Heart, House, UserRound, Users } from 'lucide-react'
import type { TodayEntry } from '../../types/domain'

interface TimelineProps {
  entries: TodayEntry[]
}

function displayTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function owner(entry: TodayEntry) {
  if (entry.kind === 'task') return { icon: House, label: 'Maison' }
  if (entry.owner === 'family') return { icon: Users, label: 'Famille' }
  return {
    icon: UserRound,
    label: entry.owner === 'florian' ? 'Florian' : 'Partenaire',
  }
}

function category(entry: TodayEntry) {
  if (entry.kind === 'task') return { className: 'timeline-category--home', icon: House, label: 'Maison' }
  if (entry.kind === 'event') {
    return { className: 'timeline-category--family', icon: Heart, label: 'Famille' }
  }
  return entry.source.space === 'school'
    ? { className: 'timeline-category--school', icon: Backpack, label: 'École' }
    : { className: 'timeline-category--child', icon: Baby, label: 'Crèche' }
}

export function Timeline({ entries }: TimelineProps) {
  return (
    <ol aria-label="Chronologie du jour" className="timeline">
      {entries.map((entry) => {
        const ownerInfo = owner(entry)
        const categoryInfo = category(entry)
        const OwnerIcon = ownerInfo.icon
        const CategoryIcon = categoryInfo.icon
        return (
          <li className="timeline__item" key={`${entry.kind}-${entry.id}`}>
            <span aria-hidden="true" className="timeline__rail">
              <span className="timeline__node" />
            </span>
            <time dateTime={entry.effectiveAt}>{displayTime(entry.effectiveAt)}</time>
            <div className="timeline__body">
              <strong>{entry.title}</strong>
              <span className="timeline__owner">
                <OwnerIcon aria-hidden="true" />
                {ownerInfo.label}
              </span>
            </div>
            <span className={`timeline__category ${categoryInfo.className}`}>
              <CategoryIcon aria-hidden="true" />
              {categoryInfo.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
