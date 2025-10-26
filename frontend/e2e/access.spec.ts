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
    
    // Find text "Grant Computer Access" and click its parent button
    const grantButton = page.locator('button:has-text("Grant Computer Access")')
    await expect(grantButton).toBeVisible()
    await grantButton.click()
    
    // Wait for dialog to appear
    await page.waitForTimeout(2000)
    const dialogTitle = page.locator('h2:has-text("Grant Computer Access")')
    await expect(dialogTitle).toBeVisible({ timeout: 5000 })
  })

  test('should open data access grant dialog', async ({ page }) => {
    await page.goto('/access')
    
    // Find and click the Grant Data Access button
    const grantButton = page.locator('button:has-text("Grant Data Access")')
    await expect(grantButton).toBeVisible()
    await grantButton.click()
    
    // Wait for dialog to appear
    await page.waitForTimeout(2000)
    const dialogTitle = page.locator('h2:has-text("Grant Data Access")')
    await expect(dialogTitle).toBeVisible({ timeout: 5000 })
  })

  test('should open physical access grant dialog', async ({ page }) => {
    await page.goto('/access')
    
    // Find and click the Grant Physical Access button
    const grantButton = page.locator('button:has-text("Grant Physical Access")')
    await expect(grantButton).toBeVisible()
    await grantButton.click()
    
    // Wait for dialog to appear
    await page.waitForTimeout(2000)
    const dialogTitle = page.locator('h2:has-text("Grant Physical Access")')
    await expect(dialogTitle).toBeVisible({ timeout: 5000 })
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

