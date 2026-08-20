import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ConnectivityBanner } from '../components/ConnectivityBanner'
import { AuthProvider } from '../features/auth/AuthProvider'
import { appConfig, type AppConfig } from '../lib/config'
import { queryClient as defaultQueryClient } from '../lib/queryClient'
import type { FamilyRepository } from '../repositories/contracts'
import type { Database } from '../types/database'
import { createAppRouter } from './router'

interface AppProps {
  repository?: FamilyRepository
  route?: string
  config?: AppConfig
  client?: SupabaseClient<Database>
  queryClient?: QueryClient
}

export function App({
  repository,
  route,
  config: suppliedConfig,
  client,
  queryClient = defaultQueryClient,
}: AppProps = {}) {
  const config: AppConfig = suppliedConfig ?? (repository === undefined ? appConfig : { mode: 'demo' })
  const [router] = useState(() => createAppRouter(repository, route))

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectivityBanner />
      <AuthProvider client={client} config={config} demoRepository={repository} queryClient={queryClient}>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
