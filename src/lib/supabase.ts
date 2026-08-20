import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import type { AppConfig } from './config'

let browserClient: SupabaseClient<Database> | undefined

export function createSupabaseBrowserClient(
  config: Extract<AppConfig, { mode: 'connected' }>,
): SupabaseClient<Database> {
  return createClient<Database>(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
}

export function getSupabaseBrowserClient(
  config: Extract<AppConfig, { mode: 'connected' }>,
): SupabaseClient<Database> {
  browserClient ??= createSupabaseBrowserClient(config)
  return browserClient
}
