import { defineConfig, devices } from 'playwright/test'

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const connectedE2E = process.env.CONNECTED_E2E_DISPOSABLE_PROJECT_ACK ===
  'I_WILL_RESET_THIS_DISPOSABLE_PROJECT'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    viewport: { width: 375, height: 812 },
    launchOptions: executablePath === undefined ? {} : { executablePath },
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command:
      connectedE2E
        ? 'npm run dev -- --host 127.0.0.1 --port 4173'
        : 'env -u VITE_SUPABASE_URL -u VITE_SUPABASE_PUBLISHABLE_KEY npm run dev -- --host 127.0.0.1 --port 4173',
    reuseExistingServer: false,
    url: 'http://127.0.0.1:4173',
  },
})
