import type { QueryClient } from '@tanstack/react-query'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { appConfig, type AppConfig } from '../../lib/config'
import { queryClient as defaultQueryClient } from '../../lib/queryClient'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { FamilyRepository } from '../../repositories/contracts'
import { createDemoRepository } from '../../repositories/demoRepository'
import {
  SupabaseFamilyRepository,
  SupabaseHouseholdRepository,
} from '../../repositories/supabaseRepository'
import type { Database } from '../../types/database'
import type { HouseholdMember } from '../../types/domain'
import { clearPendingInvitation } from './pendingInvitation'

export type AuthMode = 'demo' | 'connected' | 'error'

interface AuthContextValue {
  mode: AuthMode
  configurationError: string | null
  session: Session | null
  user: User | null
  householdId: string | null
  householdOwner: HouseholdMember['owner'] | null
  householdError: string | null
  isLoading: boolean
  isPasswordRecovery: boolean
  repository: FamilyRepository | null
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<{ confirmationRequired: boolean }>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  createHousehold(
    householdName: string,
    displayName: string,
    owner: HouseholdMember['owner'],
  ): Promise<string>
  acceptInvitation(token: string, displayName: string): Promise<string>
  issueInvitation(email: string, owner: HouseholdMember['owner']): Promise<string>
  retryHouseholdResolution(): void
  startDemo(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  config?: AppConfig
  client?: SupabaseClient<Database>
  demoRepository?: FamilyRepository
  queryClient?: QueryClient
}

function errorMessage(error: { message: string } | null) {
  if (error !== null) throw new Error(error.message)
}

export function AuthProvider({
  children,
  config = appConfig,
  client: suppliedClient,
  demoRepository: suppliedDemoRepository,
  queryClient = defaultQueryClient,
}: AuthProviderProps) {
  const [mode, setMode] = useState<AuthMode>(config.mode)
  const [session, setSession] = useState<Session | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [householdOwner, setHouseholdOwner] = useState<HouseholdMember['owner'] | null>(null)
  const [householdError, setHouseholdError] = useState<string | null>(null)
  const [householdResolutionAttempt, setHouseholdResolutionAttempt] = useState(0)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [isLoading, setIsLoading] = useState(config.mode === 'connected')
  const [demoRepository] = useState(
    () => suppliedDemoRepository ?? createDemoRepository(),
  )
  const client = useMemo(() => {
    if (config.mode !== 'connected') return null
    return suppliedClient ?? getSupabaseBrowserClient(config)
  }, [config, suppliedClient])

  const resolveHousehold = useCallback(
    async (userId: string) => {
      if (client === null) return null
      const { data, error } = await client
        .from('household_members')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      errorMessage(error)
      const membership = data?.[0]
      if (membership === undefined) return null
      return {
        householdId: membership.household_id,
        owner: membership.owner as HouseholdMember['owner'],
      }
    },
    [client],
  )

  useEffect(() => {
    if (mode !== 'connected' || client === null) {
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error !== null) {
        setIsLoading(false)
        return
      }
      setSession(data.session)
      if (data.session === null) setIsLoading(false)
    })
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      setSession(nextSession)
      if (nextSession === null) {
        setHouseholdId(null)
        setHouseholdOwner(null)
        setIsLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client, mode])

  useEffect(() => {
    if (mode !== 'connected' || session === null) return
    let active = true
    setIsLoading(true)
    setHouseholdError(null)
    void resolveHousehold(session.user.id)
      .then((resolved) => {
        if (!active) return
        setHouseholdId(resolved?.householdId ?? null)
        setHouseholdOwner(resolved?.owner ?? null)
      })
      .catch((cause: unknown) => {
        if (active) {
          setHouseholdError(
            cause instanceof Error ? cause.message : 'Le foyer n’a pas pu être chargé.',
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdResolutionAttempt, mode, resolveHousehold, session])

  const connectedRepository = useMemo(() => {
    if (mode !== 'connected' || client === null || session === null || householdId === null) {
      return null
    }
    return new SupabaseFamilyRepository({
      client,
      householdId,
      actorId: session.user.id,
      queryClient,
    })
  }, [client, householdId, mode, queryClient, session])

  const householdRepository = useMemo(
    () => client === null ? null : new SupabaseHouseholdRepository(client),
    [client],
  )

  const requireClient = useCallback(() => {
    if (client === null || mode !== 'connected') throw new Error('Supabase n’est pas connecté.')
    return client
  }, [client, mode])

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      configurationError: config.mode === 'error' ? config.message : null,
      session,
      user: session?.user ?? null,
      householdId,
      householdOwner,
      householdError,
      isLoading,
      isPasswordRecovery,
      repository: mode === 'demo' ? demoRepository : connectedRepository,
      async signIn(email, password) {
        const { error } = await requireClient().auth.signInWithPassword({ email, password })
        errorMessage(error)
      },
      async signUp(email, password) {
        const { data, error } = await requireClient().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        errorMessage(error)
        return { confirmationRequired: data.session === null }
      },
      async signOut() {
        const { error } = await requireClient().auth.signOut()
        errorMessage(error)
        setSession(null)
        setHouseholdId(null)
        setHouseholdOwner(null)
        setIsPasswordRecovery(false)
        clearPendingInvitation()
      },
      async requestPasswordReset(email) {
        const { error } = await requireClient().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/connexion`,
        })
        errorMessage(error)
      },
      async updatePassword(password) {
        const { error } = await requireClient().auth.updateUser({ password })
        errorMessage(error)
        setIsPasswordRecovery(false)
      },
      async createHousehold(householdName, displayName, owner) {
        const { data, error } = await requireClient().rpc('create_household', {
          household_name: householdName,
          creator_display_name: displayName,
          creator_owner: owner,
        })
        errorMessage(error)
        if (data === null) throw new Error('Le foyer n’a pas pu être créé.')
        setHouseholdId(data)
        setHouseholdOwner(owner)
        return data
      },
      async acceptInvitation(token, displayName) {
        const connected = requireClient()
        const { data, error } = await connected.rpc('accept_household_invitation', {
          invitation_token: token,
          member_display_name: displayName,
        })
        errorMessage(error)
        if (data === null) throw new Error('L’invitation n’a pas pu être acceptée.')
        clearPendingInvitation()
        if (session !== null) {
          const resolved = await resolveHousehold(session.user.id)
          setHouseholdId(resolved?.householdId ?? null)
          setHouseholdOwner(resolved?.owner ?? null)
        }
        return data
      },
      async issueInvitation(email, owner) {
        if (householdId === null || householdRepository === null) {
          throw new Error('Créez ou rejoignez un foyer avant d’inviter un membre.')
        }
        return householdRepository.issueInvitation(householdId, email, owner)
      },
      retryHouseholdResolution() {
        setHouseholdResolutionAttempt((attempt) => attempt + 1)
      },
      startDemo() {
        setSession(null)
        setHouseholdId(null)
        setHouseholdOwner(null)
        setIsPasswordRecovery(false)
        clearPendingInvitation()
        setMode('demo')
      },
    }),
    [
      config,
      connectedRepository,
      demoRepository,
      householdId,
      householdOwner,
      householdError,
      householdRepository,
      isLoading,
      isPasswordRecovery,
      mode,
      requireClient,
      resolveHousehold,
      session,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth doit être utilisé dans AuthProvider.')
  return context
}

export function useFamilyRepository() {
  return useAuth().repository
}
