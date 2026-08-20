import { lazy, Suspense, type ReactElement } from 'react'
import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom'
import { OnboardingPage } from '../features/auth/OnboardingPage'
import { SignInPage } from '../features/auth/SignInPage'
import { useAuth, useFamilyRepository } from '../features/auth/AuthProvider'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { ChildrenPage } from '../features/children/ChildrenPage'
import { HouseholdPage } from '../features/household/HouseholdPage'
import { ShoppingPage } from '../features/shopping/ShoppingPage'
import type { FamilyRepository } from '../repositories/contracts'
import { AppShell } from './AppShell'

const LazyTodayPage = lazy(async () => {
  const { TodayPage } = await import('../features/today/TodayPage')
  return { default: TodayPage }
})

function TodayRouteLoading() {
  return (
    <section
      aria-label="Chargement de la page Aujourd’hui"
      className="state-message"
      role="status"
    >
      <p>Chargement…</p>
    </section>
  )
}

function ConfigurationError() {
  const { configurationError } = useAuth()
  return (
    <main className="auth-page">
      <section className="auth-card" role="alert">
        <h1>Configuration requise</h1>
        <p>{configurationError}</p>
      </section>
    </main>
  )
}

function HouseholdResolutionError() {
  const auth = useAuth()
  return (
    <main className="auth-page">
      <section className="auth-card" role="alert">
        <h1>Foyer indisponible</h1>
        <p>{auth.householdError}</p>
        <button className="auth-primary" onClick={auth.retryHouseholdResolution} type="button">
          Réessayer
        </button>
      </section>
    </main>
  )
}

function ProtectedApplication() {
  const auth = useAuth()
  if (auth.mode === 'error') return <ConfigurationError />
  if (auth.isLoading) return <main className="auth-page" aria-label="Chargement" />
  if (auth.mode === 'connected' && auth.user === null) return <Navigate replace to="/connexion" />
  if (auth.mode === 'connected' && auth.householdError !== null) {
    return <HouseholdResolutionError />
  }
  if (auth.mode === 'connected' && auth.householdId === null) return <Navigate replace to="/bienvenue" />
  if (auth.repository === null) return <Navigate replace to="/connexion" />
  return <AppShell />
}

function SignInRoute() {
  const auth = useAuth()
  if (auth.mode === 'error') return <ConfigurationError />
  if (auth.isLoading) return <main className="auth-page" aria-label="Chargement" />
  if (auth.mode === 'connected' && auth.user !== null && auth.householdError !== null) {
    return <HouseholdResolutionError />
  }
  return <SignInPage />
}

function OnboardingRoute() {
  const auth = useAuth()
  if (auth.mode === 'error') return <ConfigurationError />
  if (auth.isLoading) return <main className="auth-page" aria-label="Chargement" />
  if (auth.mode === 'connected' && auth.user !== null && auth.householdError !== null) {
    return <HouseholdResolutionError />
  }
  return <OnboardingPage />
}

function RepositoryPage({
  repository: suppliedRepository,
  render,
}: {
  repository?: FamilyRepository
  render(repository: FamilyRepository): ReactElement
}) {
  const contextRepository = useFamilyRepository()
  const repository = suppliedRepository ?? contextRepository
  return repository === null ? <Navigate replace to="/connexion" /> : render(repository)
}

function routes(repository?: FamilyRepository): RouteObject[] {
  return [
    { path: '/connexion', Component: SignInRoute },
    { path: '/bienvenue', Component: OnboardingRoute },
    {
      path: '/',
      Component: ProtectedApplication,
      children: [
        {
          index: true,
          element: (
            <RepositoryPage
              repository={repository}
              render={(activeRepository) => (
                <Suspense fallback={<TodayRouteLoading />}>
                  <LazyTodayPage repository={activeRepository} />
                </Suspense>
              )}
            />
          ),
        },
        {
          path: 'agenda',
          element: <RepositoryPage repository={repository} render={(active) => <CalendarPage repository={active} />} />,
        },
        {
          path: 'courses',
          element: <RepositoryPage repository={repository} render={(active) => <ShoppingPage repository={active} />} />,
        },
        {
          path: 'maison',
          element: <RepositoryPage repository={repository} render={(active) => <HouseholdPage repository={active} />} />,
        },
        { path: 'enfants', element: <Navigate replace to="/enfants/ecole" /> },
        {
          path: 'enfants/ecole',
          element: <RepositoryPage repository={repository} render={(active) => <ChildrenPage repository={active} space="school" />} />,
        },
        {
          path: 'enfants/creche',
          element: <RepositoryPage repository={repository} render={(active) => <ChildrenPage repository={active} space="nursery" />} />,
        },
      ],
    },
    { path: '*', element: <Navigate replace to="/" /> },
  ]
}

export function createAppRouter(repository?: FamilyRepository, initialEntry?: string) {
  const appRoutes = routes(repository)
  return initialEntry === undefined
    ? createBrowserRouter(appRoutes)
    : createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })
}
