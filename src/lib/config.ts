import { z } from 'zod'

const INCOMPLETE_CONFIGURATION_MESSAGE =
  'Configuration Supabase incomplète. Renseignez l’URL et la clé publique, ou retirez les deux pour utiliser le mode démo.'

const connectedConfigurationSchema = z.object({
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().trim().startsWith('sb_publishable_').min(16),
})

export type AppConfig =
  | { mode: 'demo' }
  | { mode: 'connected'; supabaseUrl: string; supabasePublishableKey: string }
  | { mode: 'error'; message: string }

export function readAppConfig(environment: Record<string, string | boolean | undefined>): AppConfig {
  const supabaseUrl = environment.VITE_SUPABASE_URL
  const supabasePublishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY
  const hasUrl = typeof supabaseUrl === 'string' && supabaseUrl.trim().length > 0
  const hasKey =
    typeof supabasePublishableKey === 'string' && supabasePublishableKey.trim().length > 0

  if (!hasUrl && !hasKey) return { mode: 'demo' }
  if (!hasUrl || !hasKey) return { mode: 'error', message: INCOMPLETE_CONFIGURATION_MESSAGE }

  const parsed = connectedConfigurationSchema.safeParse({ supabaseUrl, supabasePublishableKey })
  if (!parsed.success) return { mode: 'error', message: INCOMPLETE_CONFIGURATION_MESSAGE }
  return { mode: 'connected', ...parsed.data }
}

export const appConfig = readAppConfig(import.meta.env)
