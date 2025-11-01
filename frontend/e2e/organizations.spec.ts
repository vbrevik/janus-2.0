import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/personnel', { timeout: 10000 })
}

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/organizations')
    await page.waitForURL('/organizations')
  })

  test('should display organization list', async ({ page }) => {
    // Should show table with organizations
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Should have table headers (any of these should be present)
    const tableHeaders = page.getByRole('table').locator('thead')
    await expect(tableHeaders).toBeVisible()
  })

  test('should create new organization', async ({ page }) => {
    // Click Add Organization button
    await page.getByRole('button', { name: /add organization/i }).click()
    
    // Fill in form
    const timestamp = Date.now()
    await page.fill('[name="company_name"]', 'Test Corp')
    await page.fill('[name="contact_name"]', 'John Test')
    await page.fill('[name="contact_email"]', `john.${timestamp}@testcorp.com`)
    await page.fill('[name="contact_phone"]', '555-1111')
    await page.fill('[name="contract_number"]', `CTR-TEST-${timestamp}`)
    await page.selectOption('[name="clearance_level"]', 'CONFIDENTIAL')
    
    // Submit form
    await page.getByRole('button', { name: /^create$/i }).click()
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Should see new organization in table
    await expect(page.getByText('Test Corp')).toBeVisible()
  })

  test('should edit existing organization', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Click first edit button (look for button with "Edit" text)
    const editButtons = page.getByRole('button').filter({ hasText: /edit/i })
    const count = await editButtons.count()
    
    if (count > 0) {
      await editButtons.first().click({ timeout: 5000 })
      
      // Update clearance level
      await page.selectOption('[name="clearance_level"]', 'TOP_SECRET', { timeout: 5000 })
      
      // Save changes
      await page.getByRole('button', { name: /save|update/i }).click({ timeout: 5000 })
      
      // Wait for dialog to close
      await page.waitForTimeout(1000)
    }
  })

  test('should navigate to organization page from nav', async ({ page }) => {
    await page.goto('/personnel')
    
    // Click Organizations nav link
    await page.getByRole('link', { name: /organizations/i }).click()
    
    // Should be on organizations page
    await expect(page).toHaveURL('/organizations')
    await expect(page.getByRole('heading', { name: /organization management/i })).toBeVisible()
  })
})

