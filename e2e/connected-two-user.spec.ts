import { expect, test, type BrowserContext, type Page } from 'playwright/test'

const required = {
  ownerEmail: process.env.CONNECTED_E2E_OWNER_EMAIL,
  ownerPassword: process.env.CONNECTED_E2E_OWNER_PASSWORD,
  partnerEmail: process.env.CONNECTED_E2E_PARTNER_EMAIL,
  partnerPassword: process.env.CONNECTED_E2E_PARTNER_PASSWORD,
  foreignHouseholdId: process.env.CONNECTED_E2E_FOREIGN_HOUSEHOLD_ID,
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  disposableAck: process.env.CONNECTED_E2E_DISPOSABLE_PROJECT_ACK,
}

const configured = Object.values(required).every((value) => value !== undefined && value !== '')
  && required.disposableAck === 'I_WILL_RESET_THIS_DISPOSABLE_PROJECT'

test.skip(
  !configured,
  'Requires two pre-confirmed disposable accounts, a foreign household fixture, public browser credentials, and explicit project-reset acknowledgement.',
)

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/connexion')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

async function clearBrowserState(context: BrowserContext) {
  await context.clearCookies()
  const page = await context.newPage()
  await page.goto('/connexion')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.close()
}

test('two confirmed users share one household in Realtime and cannot read a foreign household', async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const partnerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  const partner = await partnerContext.newPage()
  const unique = crypto.randomUUID().slice(0, 8)

  try {
    await signIn(owner, required.ownerEmail!, required.ownerPassword!)
    await expect(owner.getByRole('heading', { name: /Bienvenue dans votre espace familial/ })).toBeVisible()
    await owner.getByLabel('Nom du foyer').fill(`Connected E2E ${unique}`)
    await owner.getAllByLabel('Votre prénom').first().fill('Owner E2E')
    await owner.getByRole('button', { name: 'Créer mon foyer' }).click()
    await owner.getByLabel('Adresse e-mail invitée').fill(required.partnerEmail!)
    await owner.getByRole('button', { name: "Créer le lien d’invitation" }).click()
    const invitationUrl = await owner.getByLabel("Lien d’invitation").inputValue()

    await partner.goto(invitationUrl)
    await expect(partner.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    await partner.getByLabel('Adresse e-mail').fill(required.partnerEmail!)
    await partner.getByLabel('Mot de passe').fill(required.partnerPassword!)
    await partner.getByRole('button', { name: 'Se connecter' }).click()
    await partner.getAllByLabel('Votre prénom').last().fill('Partner E2E')
    await partner.getByRole('button', { name: "Accepter l’invitation" }).click()
    await expect(partner.getByRole('heading', { name: /bonjour/i })).toBeVisible()
    await partner.getByRole('link', { name: /courses/i }).first().click()
    await expect(partner.getByRole('heading', { name: 'Courses' })).toBeVisible()

    await owner.getByRole('button', { name: 'Accéder au foyer' }).click()
    await owner.getByRole('button', { name: /^ajouter$/i }).click()
    await owner.getByRole('tab', { name: /article/i }).click()
    await owner.getByLabel(/article/i).fill(`Realtime ${unique}`)
    await owner.getByRole('dialog').getByRole('button', { name: /^ajouter$/i }).click()
    await expect(partner.getByText(`Realtime ${unique}`)).toBeVisible({ timeout: 15_000 })

    const isolation = await owner.evaluate(
      async ({ supabaseUrl, supabaseKey, foreignHouseholdId }) => {
        const authValue = Object.entries(localStorage)
          .find(([key]) => key.startsWith('sb-') && key.endsWith('-auth-token'))?.[1]
        const accessToken = authValue === undefined
          ? null
          : (JSON.parse(authValue) as { access_token?: string }).access_token ?? null
        if (accessToken === null) return { status: 0, rows: null }
        const response = await fetch(
          `${supabaseUrl}/rest/v1/shopping_items?select=id&household_id=eq.${foreignHouseholdId}`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` } },
        )
        return { status: response.status, rows: await response.json() as unknown }
      },
      {
        supabaseUrl: required.supabaseUrl!,
        supabaseKey: required.supabaseKey!,
        foreignHouseholdId: required.foreignHouseholdId!,
      },
    )
    expect(isolation).toEqual({ status: 200, rows: [] })
  } finally {
    await clearBrowserState(ownerContext)
    await clearBrowserState(partnerContext)
    await ownerContext.close()
    await partnerContext.close()
  }
})
