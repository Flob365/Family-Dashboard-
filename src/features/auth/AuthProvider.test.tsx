import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppRouter } from '../../app/router'
import type { AppConfig } from '../../lib/config'
import { createDemoRepository } from '../../repositories/demoRepository'
import { AuthProvider, useAuth } from './AuthProvider'
import { OnboardingPage } from './OnboardingPage'

const connectedConfig: AppConfig = {
  mode: 'connected',
  supabaseUrl: 'https://project.supabase.co',
  supabasePublishableKey: 'sb_publishable_browser-key',
}

const session = {
  access_token: 'session-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: 1_800_000_000,
  token_type: 'bearer',
  user: {
    id: 'user-a',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-13T10:00:00.000Z',
    email: 'parent@example.com',
  },
} satisfies Session

const membershipsForTest = [
  {
    id: 'membership-a', household_id: 'household-a', user_id: 'user-a',
    display_name: 'Florian', owner: 'florian', role: 'owner', created_by: 'user-a',
    created_at: '2026-08-13T10:00:00.000Z', updated_at: '2026-08-13T10:00:00.000Z',
  },
]

function createAuthClient(
  initialSession: Session | null = null,
  suppliedMembershipResults?: Array<{
    data: typeof membershipsForTest
    error: { message: string } | null
  }>,
) {
  let authChange: ((event: string, nextSession: Session | null) => void) | undefined
  const unsubscribe = vi.fn()
  const rpcCalls: Array<{ name: string; args: unknown }> = []
  const membershipResults = suppliedMembershipResults ?? [{ data: membershipsForTest, error: null }]

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: initialSession }, error: null })),
      onAuthStateChange: vi.fn((callback: typeof authChange) => {
        authChange = callback
        return { data: { subscription: { unsubscribe } } }
      }),
      signInWithPassword: vi.fn(async () => ({ data: { session, user: session.user }, error: null })),
      signUp: vi.fn(async () => ({ data: { session: null, user: session.user }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(async () =>
            membershipResults.length > 1 ? membershipResults.shift()! : membershipResults[0],
          ),
        })),
      })),
    })),
    rpc: vi.fn(async (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return {
        data: name === 'create_household'
          ? 'household-a'
          : name === 'issue_household_invitation'
            ? '22222222-2222-4222-8222-222222222222'
            : 'membership-a',
        error: null,
      }
    }),
  }

  return {
    client,
    emitAuthChange(nextSession: Session | null) {
      authChange?.('SIGNED_IN', nextSession)
    },
    rpcCalls,
    unsubscribe,
  }
}

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <output aria-label="mode">{auth.mode}</output>
      <output aria-label="email">{auth.user?.email ?? 'none'}</output>
      <output aria-label="household">{auth.householdId ?? 'none'}</output>
      <output aria-label="household-owner">{auth.householdOwner ?? 'none'}</output>
      <output aria-label="household-error">{auth.householdError ?? 'none'}</output>
      <button onClick={() => void auth.signIn('parent@example.com', 'correct horse')} type="button">
        Sign in
      </button>
      <button onClick={() => void auth.signUp('new@example.com', 'correct horse')} type="button">
        Sign up
      </button>
      <button onClick={() => void auth.signOut()} type="button">
        Sign out
      </button>
      <button onClick={() => void auth.requestPasswordReset('parent@example.com')} type="button">
        Reset
      </button>
      <button onClick={() => void auth.createHousehold('Maison Dupont', 'Florian', 'florian')} type="button">
        Create household
      </button>
      <button onClick={() => void auth.acceptInvitation('11111111-1111-1111-1111-111111111111', 'Alex')} type="button">
        Accept invitation
      </button>
      <button onClick={() => void auth.issueInvitation('partner@example.com', 'partner')} type="button">
        Issue invitation
      </button>
      <button onClick={auth.retryHouseholdResolution} type="button">Retry household</button>
      <button onClick={auth.startDemo} type="button">
        Demo
      </button>
    </div>
  )
}

function Harness({ children, client }: { children: ReactNode; client: ReturnType<typeof createAuthClient>['client'] }) {
  return (
    <AuthProvider client={client as never} config={connectedConfig}>
      {children}
    </AuthProvider>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('forwards password auth operations and releases the auth subscription', async () => {
    const boundary = createAuthClient()
    const user = userEvent.setup()
    const view = render(
      <Harness client={boundary.client}>
        <Probe />
      </Harness>,
    )

    expect(await screen.findByLabelText('mode')).toHaveTextContent('connected')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(boundary.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'parent@example.com',
      password: 'correct horse',
    })
    expect(boundary.client.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'correct horse',
      options: { emailRedirectTo: window.location.origin },
    })
    expect(boundary.client.auth.resetPasswordForEmail).toHaveBeenCalledWith('parent@example.com', {
      redirectTo: window.location.origin,
    })
    expect(boundary.client.auth.signOut).toHaveBeenCalledOnce()

    view.unmount()
    expect(boundary.unsubscribe).toHaveBeenCalledOnce()
  })

  it('tracks auth state changes and resolves the active household from the signed-in user membership', async () => {
    const boundary = createAuthClient()
    render(
      <Harness client={boundary.client}>
        <Probe />
      </Harness>,
    )
    expect(await screen.findByLabelText('email')).toHaveTextContent('none')

    await act(async () => boundary.emitAuthChange(session))

    expect(screen.getByLabelText('email')).toHaveTextContent('parent@example.com')
    await waitFor(() => {
      expect(screen.getByLabelText('household')).toHaveTextContent('household-a')
      expect(screen.getByLabelText('household-owner')).toHaveTextContent('florian')
    })
  })

  it('lets an existing household owner create a partner invitation from household settings', async () => {
    const boundary = createAuthClient(session)
    const router = createAppRouter(createDemoRepository(), '/parametres/foyer')
    const user = userEvent.setup()
    render(
      <Harness client={boundary.client}>
        <RouterProvider router={router} />
      </Harness>,
    )

    expect(await screen.findByRole('heading', { name: 'Paramètres du foyer' })).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Paramètres du foyer' }).length).toBeGreaterThan(0)

    await user.type(screen.getByLabelText('Adresse e-mail de votre partenaire'), 'partner@example.com')
    await user.click(screen.getByRole('button', { name: 'Créer le lien d’invitation' }))

    expect(await screen.findByLabelText('Lien d’invitation')).toHaveValue(
      'http://localhost:3000/bienvenue?invitation=22222222-2222-4222-8222-222222222222',
    )
    expect(boundary.rpcCalls).toContainEqual({
      name: 'issue_household_invitation',
      args: {
        target_household_id: 'household-a',
        invited_email: 'partner@example.com',
        invited_owner: 'partner',
      },
    })
  })

  it('delivers a generated invitation through copy and native sharing actions', async () => {
    const boundary = createAuthClient(session)
    const router = createAppRouter(createDemoRepository(), '/parametres/foyer')
    const user = userEvent.setup()
    const writeText = vi.fn(async () => undefined)
    const share = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    render(
      <Harness client={boundary.client}>
        <RouterProvider router={router} />
      </Harness>,
    )

    await user.type(
      await screen.findByLabelText('Adresse e-mail de votre partenaire'),
      'partner@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Créer le lien d’invitation' }))
    await screen.findByLabelText('Lien d’invitation')

    await user.click(screen.getByRole('button', { name: 'Copier le lien' }))
    await user.click(screen.getByRole('button', { name: 'Partager le lien' }))

    const invitationUrl =
      'http://localhost:3000/bienvenue?invitation=22222222-2222-4222-8222-222222222222'
    expect(writeText).toHaveBeenCalledWith(invitationUrl)
    expect(share).toHaveBeenCalledWith({
      title: 'Invitation Maison',
      text: 'Rejoins notre foyer dans Maison.',
      url: invitationUrl,
    })
  })

  it('uses only the public onboarding RPCs and can switch to a visibly distinct demo session', async () => {
    const boundary = createAuthClient(session)
    const user = userEvent.setup()
    render(
      <Harness client={boundary.client}>
        <Probe />
      </Harness>,
    )
    await waitFor(() => expect(screen.getByLabelText('household')).toHaveTextContent('household-a'))

    await user.click(screen.getByRole('button', { name: 'Create household' }))
    await user.click(screen.getByRole('button', { name: 'Issue invitation' }))
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

    expect(boundary.rpcCalls).toEqual([
      {
        name: 'create_household',
        args: {
          household_name: 'Maison Dupont',
          creator_display_name: 'Florian',
          creator_owner: 'florian',
        },
      },
      {
        name: 'issue_household_invitation',
        args: {
          target_household_id: 'household-a',
          invited_email: 'partner@example.com',
          invited_owner: 'partner',
        },
      },
      {
        name: 'accept_household_invitation',
        args: {
          invitation_token: '11111111-1111-1111-1111-111111111111',
          member_display_name: 'Alex',
        },
      },
    ])

    await user.click(screen.getByRole('button', { name: 'Demo' }))
    expect(screen.getByLabelText('mode')).toHaveTextContent('demo')
  })

  it('preserves the prior household, exposes resolution failures, and retries successfully', async () => {
    const membershipB = [{
      ...membershipsForTest[0],
      id: 'membership-b',
      household_id: 'household-b',
    }]
    const boundary = createAuthClient(session, [
      { data: membershipsForTest, error: null },
      { data: [], error: { message: 'membership lookup failed' } },
      { data: membershipB, error: null },
    ])
    const user = userEvent.setup()
    render(<Harness client={boundary.client}><Probe /></Harness>)
    await waitFor(() => expect(screen.getByLabelText('household')).toHaveTextContent('household-a'))

    await act(async () => boundary.emitAuthChange({ ...session, access_token: 'next-token' }))
    await waitFor(() => expect(screen.getByLabelText('household-error')).toHaveTextContent('membership lookup failed'))
    expect(screen.getByLabelText('household')).toHaveTextContent('household-a')

    await user.click(screen.getByRole('button', { name: 'Retry household' }))
    await waitFor(() => expect(screen.getByLabelText('household')).toHaveTextContent('household-b'))
    expect(screen.getByLabelText('household-error')).toHaveTextContent('none')
  })

  it('captures an invitation token and immediately scrubs it from the onboarding URL', async () => {
    const boundary = createAuthClient(session, [{ data: [], error: null }])
    function OnboardingHarness() {
      const auth = useAuth()
      const location = useLocation()
      if (auth.isLoading) return null
      return <><OnboardingPage /><output aria-label="route-search">{location.search}</output></>
    }
    const router = createMemoryRouter(
      [{ path: '/bienvenue', element: <OnboardingHarness /> }],
      { initialEntries: ['/bienvenue?invitation=secret-token&utm_source=test'] },
    )
    render(
      <Harness client={boundary.client}>
        <RouterProvider router={router} />
      </Harness>,
    )

    expect(await screen.findByLabelText('Jeton d’invitation')).toHaveValue('secret-token')
    await waitFor(() => expect(screen.getByLabelText('route-search')).toHaveTextContent('?utm_source=test'))
    expect(screen.getByLabelText('route-search')).not.toHaveTextContent('invitation')
  })

  it('preserves a scrubbed invitation through sign-in and clears it after acceptance', async () => {
    const boundary = createAuthClient(null, [
      { data: [], error: null },
      { data: membershipsForTest, error: null },
    ])
    const router = createAppRouter(
      undefined,
      '/bienvenue?invitation=11111111-1111-4111-8111-111111111111',
    )
    const user = userEvent.setup()
    render(
      <Harness client={boundary.client}>
        <RouterProvider router={router} />
      </Harness>,
    )

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion')
    expect(router.state.location.search).toBe('')
    expect(sessionStorage.length).toBe(1)

    await act(async () => boundary.emitAuthChange(session))
    expect(await screen.findByLabelText('Jeton d’invitation')).toHaveValue(
      '11111111-1111-4111-8111-111111111111',
    )
    expect(router.state.location.search).toBe('')

    await user.type(screen.getAllByLabelText('Votre prénom')[1], 'Alex')
    await user.click(screen.getByRole('button', { name: 'Accepter l’invitation' }))
    await waitFor(() => expect(sessionStorage.length).toBe(0))
    expect(router.state.location.search).toBe('')
  })

  it('defaults invitation issuance to the only unoccupied owner slot', async () => {
    const boundary = createAuthClient(session, [{ data: [], error: null }])
    const router = createAppRouter(undefined, '/bienvenue')
    const user = userEvent.setup()
    render(
      <Harness client={boundary.client}>
        <RouterProvider router={router} />
      </Harness>,
    )

    await user.type(await screen.findByLabelText('Nom du foyer'), 'Maison Dupont')
    await user.type(screen.getAllByLabelText('Votre prénom')[0], 'Florian')
    await user.click(screen.getByRole('button', { name: 'Créer mon foyer' }))

    const invitedOwner = await screen.findByLabelText('Repère de la personne invitée')
    expect(invitedOwner).toHaveValue('partner')
    expect(screen.queryByRole('option', { name: 'Florian' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Partenaire' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Adresse e-mail invitée'), 'partner@example.com')
    await user.click(screen.getByRole('button', { name: "Créer le lien d’invitation" }))
    expect(boundary.rpcCalls.at(-1)).toEqual({
      name: 'issue_household_invitation',
      args: {
        target_household_id: 'household-a',
        invited_email: 'partner@example.com',
        invited_owner: 'partner',
      },
    })
  })

  it.each(['/connexion', '/bienvenue'])(
    'guards %s with retryable household errors before onboarding',
    async (route) => {
      const boundary = createAuthClient(session, [
        { data: [], error: { message: 'membership lookup failed' } },
        { data: [], error: null },
      ])
      const router = createAppRouter(undefined, route)
      const user = userEvent.setup()
      render(
        <Harness client={boundary.client}>
          <RouterProvider router={router} />
        </Harness>,
      )

      expect(await screen.findByRole('heading', { name: 'Foyer indisponible' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Bienvenue dans votre espace familial/ })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Réessayer' }))
      expect(await screen.findByRole('heading', { name: /Bienvenue dans votre espace familial/ })).toBeInTheDocument()
    },
  )
})
