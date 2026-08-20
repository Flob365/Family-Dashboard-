import { expect, test, type Page } from 'playwright/test'

async function openDemoToday(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const demoEntry = page.getByRole('button', { name: /découvrir en mode démo/i })
  if (await demoEntry.isVisible()) await demoEntry.click()
  await expect(page.getByRole('heading', { name: /bonjour florian/i })).toBeVisible()
  await expect(page.getByRole('navigation', { name: /navigation principale/i }).last()).toBeVisible()
}

test('family completes the daily core flow', async ({ page }) => {
  await openDemoToday(page)
  await page.getByRole('button', { name: /^ajouter$/i }).click()
  await page.getByRole('tab', { name: /article/i }).click()
  await page.getByLabel(/article/i).fill('Tomates cerises')
  await page.getByRole('dialog').getByRole('button', { name: /^ajouter$/i }).click()
  await page.getByRole('link', { name: /courses/i }).first().click()
  await page.getByRole('checkbox', { name: /tomates cerises/i }).check()
  await expect(page.getByRole('region', { name: /pris/i })).toContainText('Tomates cerises')
})

test('keyboard focus starts on a visible named control after Today is ready', async ({ page }, testInfo) => {
  const evidence = []
  for (const width of [375, 430]) {
    await page.setViewportSize({ width, height: 812 })
    await openDemoToday(page)
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return null
      const style = getComputedStyle(active)
      const label =
        active.getAttribute('aria-label') ||
        (active instanceof HTMLInputElement ||
        active instanceof HTMLSelectElement ||
        active instanceof HTMLTextAreaElement
          ? active.labels?.[0]?.textContent?.trim()
          : '') ||
        active.textContent?.trim()
      return {
        name: label ?? '',
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        tag: active.tagName,
        visible: active.getClientRects().length > 0 && style.visibility !== 'hidden',
      }
    })

    expect(focused).not.toBeNull()
    expect(focused?.tag).not.toBe('BODY')
    expect(focused?.visible).toBe(true)
    expect(focused?.name).not.toBe('')
    expect(focused?.outlineStyle).not.toBe('none')
    evidence.push({ width, ...focused })
  }
  await testInfo.attach('keyboard-qa.json', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  })
})
