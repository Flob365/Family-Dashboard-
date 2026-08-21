import {
  CalendarDays,
  CalendarRange,
  House,
  Mic,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

const destinations = [
  { to: '/', label: "Aujourd'hui", icon: CalendarDays },
  { to: '/agenda', label: 'Agenda', icon: CalendarRange },
  { to: '/courses', label: 'Courses', icon: ShoppingCart },
  { to: '/maison', label: 'Maison', icon: House },
  { to: '/enfants', label: 'Enfants', icon: Users },
]

const settingsDestination = { to: '/parametres/foyer', label: 'Paramètres du foyer', icon: Settings }

function Navigation({ className }: { className: string }) {
  return (
    <nav aria-label="Navigation principale" className={className}>
      {destinations.map(({ icon: Icon, label, to }) => (
        <NavLink className="app-nav__link" end={to === '/'} key={to} to={to}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function VoiceControl({ className }: { className: string }) {
  const descriptionId = `${className}-voice-description`
  return (
    <div className={`voice-control ${className}`}>
      <button aria-describedby={descriptionId} disabled type="button">
        <Mic aria-hidden="true" />
        <span>Bientôt</span>
      </button>
      <span className="visually-hidden" id={descriptionId}>
        La saisie vocale arrivera prochainement
      </span>
    </div>
  )
}

export function AppShell() {
  const { mode } = useAuth()
  return (
    <div className="app-shell">
      <header className="mobile-header">
        <div className="brand-lockup">
          <span className="wordmark">Maison</span>
          {mode === 'demo' ? <span className="demo-badge">Démo</span> : null}
        </div>
        <NavLink aria-label="Paramètres du foyer" className="mobile-settings-link" to={settingsDestination.to}>
          <Settings aria-hidden="true" />
        </NavLink>
      </header>

      <aside className="desktop-sidebar">
        <div className="brand-lockup">
          <span className="wordmark">Maison</span>
          {mode === 'demo' ? <span className="demo-badge">Démo</span> : null}
        </div>
        <Navigation className="app-nav app-nav--desktop" />
        <nav aria-label="Paramètres" className="app-nav app-nav--desktop app-nav--settings">
          <NavLink className="app-nav__link" to={settingsDestination.to}>
            <Settings aria-hidden="true" />
            <span>{settingsDestination.label}</span>
          </NavLink>
        </nav>
        <VoiceControl className="voice-control--desktop" />
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <Navigation className="app-nav app-nav--mobile" />
    </div>
  )
}

export { VoiceControl }
