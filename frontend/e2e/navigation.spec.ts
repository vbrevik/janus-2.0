import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate between all pages', async ({ page }) => {
    // Start at personnel
    await expect(page).toHaveURL('/personnel')
    
    // Navigate to vendors
    await page.getByRole('link', { name: /vendors/i }).click()
    await expect(page).toHaveURL('/vendors')
    await expect(page.getByRole('heading', { name: /vendor management/i })).toBeVisible()
    
    // Navigate to access control
    await page.getByRole('link', { name: /access control/i }).click()
    await expect(page).toHaveURL('/access')
    await expect(page.getByRole('heading', { name: /access control/i })).toBeVisible()
    
    // Navigate to audit logs
    await page.getByRole('link', { name: /audit logs/i }).click()
    await expect(page).toHaveURL('/audit')
    await expect(page.getByRole('heading', { name: /audit logs/i })).toBeVisible()
    
    // Navigate back to personnel
    await page.getByRole('link', { name: /personnel/i }).click()
    await expect(page).toHaveURL('/personnel')
  })

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/personnel')
    
    // Personnel link should be active
    const personnelLink = page.getByRole('link', { name: /personnel/i })
    await expect(personnelLink).toHaveAttribute('data-status', 'active')
    
    // Navigate to vendors
    await page.getByRole('link', { name: /vendors/i }).click()
    
    // Vendors link should be active
    const vendorsLink = page.getByRole('link', { name: /vendors/i })
    await expect(vendorsLink).toHaveAttribute('data-status', 'active')
  })

  test('should show user info in header', async ({ page }) => {
    await expect(page.getByText('admin')).toBeVisible()
    await expect(page.getByText('admin').locator('..').getByText(/admin/i)).toBeVisible()
  })
})

