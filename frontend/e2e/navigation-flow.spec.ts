import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Navigation Flow
 * Tests navigation between pages for each role
 */

// Helper to login via API
async function loginAsAdmin(page: any) {
  const response = await page.request.post('http://localhost:15520/api/auth/login', {
    data: { username: 'admin', password: 'password123' },
  })
  expect(response.status()).toBe(200)
  const data = await response.json()
  
  await page.goto('http://localhost:5173/')
  await page.evaluate(({ token, userId, role }: any) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: userId, username: 'admin', role }))
  }, { token: data.token, userId: data.user_id, role: data.role })
  
  await page.reload()
  await page.waitForLoadState('networkidle')
  return data
}

test.describe('Admin Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('can navigate between admin pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('http://localhost:5173/admin/dashboard')
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)

    // Navigate to Personnel
    await page.click('text=Personnel')
    await expect(page).toHaveURL(/.*\/admin\/personnel/)

    // Navigate to Vendors
    await page.click('text=Vendors')
    await expect(page).toHaveURL(/.*\/admin\/vendors/)

    // Navigate to Info Systems
    await page.click('text=Info Systems')
    await expect(page).toHaveURL(/.*\/admin\/info-systems/)

    // Navigate to Access Control
    await page.click('text=Access Control')
    await expect(page).toHaveURL(/.*\/admin\/access/)

    // Navigate to NDAs
    await page.click('text=NDAs')
    await expect(page).toHaveURL(/.*\/admin\/ndas/)

    // Navigate to Audit Logs
    await page.click('text=Audit Logs')
    await expect(page).toHaveURL(/.*\/admin\/audit/)

    // Navigate to Roles
    await page.click('text=Roles')
    await expect(page).toHaveURL(/.*\/admin\/roles/)

    // Navigate back to Dashboard
    await page.click('text=Dashboard')
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
  })

  test('logo link navigates to dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/personnel')
    
    // Click logo
    await page.click('text=Janus 2.0')
    
    // Should navigate to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
  })

  test('navigation items are highlighted when active', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/dashboard')
    
    // Dashboard link should be active
    const dashboardLink = page.locator('a[href="/admin/dashboard"]')
    await expect(dashboardLink).toHaveAttribute('data-status', 'active')

    // Navigate to Personnel
    await page.click('text=Personnel')
    await page.waitForURL(/.*\/admin\/personnel/)
    
    // Personnel link should be active
    const personnelLink = page.locator('a[href*="/admin/personnel"]').first()
    await expect(personnelLink).toHaveAttribute('data-status', 'active')
  })
})

test.describe('Header and Profile Menu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('http://localhost:5173/admin/dashboard')
  })

  test('profile dropdown shows user info', async ({ page }) => {
    // Click profile dropdown
    const profileButton = page.locator('button:has-text("admin")')
    await profileButton.click()
    
    // Should show username and role
    await expect(page.getByText('admin')).toBeVisible()
    await expect(page.getByText('admin', { exact: false })).toBeVisible()
  })

  test('profile dropdown links work', async ({ page }) => {
    // Click profile dropdown
    await page.locator('button:has-text("admin")').click()
    
    // Click Profile Settings
    await page.getByText('Profile Settings').click()
    await expect(page).toHaveURL(/.*\/admin\/profile/)
    
    // Go back to dashboard
    await page.goto('http://localhost:5173/admin/dashboard')
    await page.locator('button:has-text("admin")').click()
    
    // Click Change Password
    await page.getByText('Change Password').click()
    await expect(page).toHaveURL(/.*\/admin\/profile/)
    // Should have change=1 in URL
    await expect(page).toHaveURL(/.*change=1/)
  })

  test('logout works', async ({ page }) => {
    // Click profile dropdown
    await page.locator('button:has-text("admin")').click()
    
    // Click Logout
    await page.getByText('Logout').click()
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/)
    
    // Try to access protected route
    await page.goto('http://localhost:5173/admin/dashboard')
    
    // Should redirect back to login
    await expect(page).toHaveURL(/.*\/login/)
  })
})

