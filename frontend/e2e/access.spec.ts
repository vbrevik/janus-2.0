import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/personnel', { timeout: 10000 })
}

test.describe('Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display access control page', async ({ page }) => {
    await page.goto('/access')
    await page.waitForURL('/access')
    
    // Should see access control heading
    await expect(page.getByRole('heading', { name: /access control/i })).toBeVisible({ timeout: 5000 })
  })

  test('should open computer access grant dialog', async ({ page }) => {
    await page.goto('/access')
    
    // Enter personnel ID if present
    const personnelInput = page.locator('input[type="number"]').first()
    if (await personnelInput.isVisible()) {
      await personnelInput.fill('1')
    }
    
    // Click grant computer access button
    const computerCardButtons = page.locator('text=Computer Access').locator('..').locator('button')
    await computerCardButtons.click()
    
    // Dialog should open (check for any dialog content)
    await page.waitForTimeout(1000)
    const dialogVisible = await page.locator('[role="dialog"]').isVisible()
    expect(dialogVisible).toBeTruthy()
  })

  test('should open data access grant dialog', async ({ page }) => {
    await page.goto('/access')
    
    // Enter personnel ID if present
    const personnelInput = page.locator('input[type="number"]').first()
    if (await personnelInput.isVisible()) {
      await personnelInput.fill('1')
    }
    
    // Click grant data access button
    const dataCardButtons = page.locator('text=Data Access').locator('..').locator('button')
    await dataCardButtons.click()
    
    // Dialog should open
    await page.waitForTimeout(1000)
    const dialogVisible = await page.locator('[role="dialog"]').isVisible()
    expect(dialogVisible).toBeTruthy()
  })

  test('should open physical access grant dialog', async ({ page }) => {
    await page.goto('/access')
    
    // Enter personnel ID if present
    const personnelInput = page.locator('input[type="number"]').first()
    if (await personnelInput.isVisible()) {
      await personnelInput.fill('1')
    }
    
    // Click grant physical access button
    const physicalCardButtons = page.locator('text=Physical Access').locator('..').locator('button')
    await physicalCardButtons.click()
    
    // Dialog should open
    await page.waitForTimeout(1000)
    const dialogVisible = await page.locator('[role="dialog"]').isVisible()
    expect(dialogVisible).toBeTruthy()
  })

  test('should navigate to access control from main navigation', async ({ page }) => {
    // Should already be on personnel page
    await page.waitForURL('/personnel')
    
    // Navigate to access control
    const accessLink = page.getByRole('link').filter({ hasText: /access/i }).first()
    await expect(accessLink).toBeVisible()
    await accessLink.click()
    
    // Should be on access control page
    await expect(page).toHaveURL('/access')
  })
})

