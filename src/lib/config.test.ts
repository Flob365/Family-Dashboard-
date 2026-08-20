import { describe, expect, it } from 'vitest'
import { readAppConfig } from './config'

describe('readAppConfig', () => {
  it('selects demo mode when neither public Supabase credential is configured', () => {
    expect(readAppConfig({})).toEqual({ mode: 'demo' })
  })

  it('selects connected mode only when both public Supabase credentials are configured', () => {
    expect(
      readAppConfig({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser-key',
      }),
    ).toEqual({
      mode: 'connected',
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: 'sb_publishable_browser-key',
    })
  })

  it.each([
    [{ VITE_SUPABASE_URL: 'https://project.supabase.co' }],
    [{ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser-key' }],
  ])('returns a user-visible configuration error for partial credentials', (environment) => {
    expect(readAppConfig(environment)).toEqual({
      mode: 'error',
      message:
        'Configuration Supabase incomplète. Renseignez l’URL et la clé publique, ou retirez les deux pour utiliser le mode démo.',
    })
  })

  it('ignores similarly named private or legacy credentials', () => {
    expect(
      readAppConfig({
        VITE_SUPABASE_ANON_KEY: 'legacy-key',
        SUPABASE_SERVICE_ROLE_KEY: 'must-not-be-read',
      }),
    ).toEqual({ mode: 'demo' })
  })
})
