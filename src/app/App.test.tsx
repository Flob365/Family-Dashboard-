import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { AppConfig } from '../lib/config'
import { App } from './App'

async function settleTodayRoute() {
  await act(async () => {
    await vi.dynamicImportSettled()
  })
}

it('shows an explicit state while the lazy Today route is loading', async () => {
  render(<App config={{ mode: 'demo' }} route="/" />)

  expect(screen.getByRole('status', { name: 'Chargement de la page Aujourd’hui' })).toBeVisible()
  await settleTodayRoute()
  expect(await screen.findByRole('heading', { name: /bonjour/i })).toBeVisible()
  expect(await screen.findByText('Départ école')).toBeVisible()
})

it('renders the French family home', async () => {
  render(<App config={{ mode: 'demo' }} route="/" />)

  await settleTodayRoute()
  expect(await screen.findByRole('heading', { name: /bonjour/i })).toBeInTheDocument()
  expect(await screen.findByText('Départ école')).toBeVisible()
  expect(screen.getAllByRole('navigation', { name: /navigation principale/i })).toHaveLength(2)
  expect(screen.getAllByText('Démo').length).toBeGreaterThan(0)
})

it('shows a visible error instead of starting with partial Supabase configuration', () => {
  const config: AppConfig = { mode: 'error', message: 'Configuration Supabase incomplète.' }
  render(<App config={config} route="/" />)

  expect(screen.getByRole('alert')).toHaveTextContent('Configuration Supabase incomplète.')
})

it('protects connected routes and keeps an explicit path into demo mode', async () => {
  const config: AppConfig = {
    mode: 'connected',
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'sb_publishable_browser-key',
  }
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(),
    },
  }
  const user = userEvent.setup()
  render(<App client={client as never} config={config} route="/" />)

  expect(await screen.findByRole('heading', { name: /connexion/i })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Découvrir en mode démo' }))

  await settleTodayRoute()
  expect(await screen.findByRole('heading', { name: /bonjour/i })).toBeInTheDocument()
  expect(await screen.findByText('Départ école')).toBeVisible()
  expect(screen.getAllByText('Démo').length).toBeGreaterThan(0)
})

it('surfaces lost connectivity without replacing the active application', async () => {
  render(<App config={{ mode: 'demo' }} route="/" />)
  await settleTodayRoute()
  expect(await screen.findByRole('heading', { name: /bonjour/i })).toBeVisible()
  expect(await screen.findByText('Départ école')).toBeVisible()

  act(() => window.dispatchEvent(new Event('offline')))

  expect(screen.getByRole('status')).toHaveTextContent(/hors ligne/i)
  expect(screen.getByRole('heading', { name: /bonjour/i })).toBeVisible()
})
