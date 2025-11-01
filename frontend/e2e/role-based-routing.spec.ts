import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Role-Based Routing
 * Tests route guards, navigation, and access control for all roles
 */

// Helper function to login via API and set up session
async function loginAsRole(page: any, username: string, password: string) {
  const response = await page.request.post('http://localhost:15520/api/auth/login', {
    data: { username, password },
  })
  expect(response.status()).toBe(200)
  const data = await response.json()
  
  // Navigate to a page and set localStorage
  await page.goto('http://localhost:5173/')
  await page.evaluate(({ token, userId, role, username }: any) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: userId, username, role }))
  }, { token: data.token, userId: data.user_id, role: data.role, username })
  
  // Reload to apply auth state
  await page.reload()
  await page.waitForLoadState('networkidle')
  
  return data
}

// Helper to create test users if needed (assumes backend has seed data)
// Using existing admin user for admin tests
const TEST_CREDENTIALS = {
  admin: { username: 'admin', password: 'password123' },
  // For enduser and official, we'll need to check if test users exist
  // or create them via API
  enduser: { username: 'enduser', password: 'password123' },
  official: { username: 'official', password: 'password123' },
}

test.describe('Role-Based Route Guards', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login')
  })

  test('Admin user can access admin routes', async ({ page }) => {
    // Login as admin
    await loginAsRole(page, TEST_CREDENTIALS.admin.username, TEST_CREDENTIALS.admin.password)
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
    
    // Should see admin navigation items
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Personnel')).toBeVisible()
    await expect(page.getByText('Organizations')).toBeVisible()
    await expect(page.getByText('Info Systems')).toBeVisible()
    await expect(page.getByText('Access Control')).toBeVisible()
    await expect(page.getByText('NDAs')).toBeVisible()
    await expect(page.getByText('Audit Logs')).toBeVisible()
    await expect(page.getByText('Roles')).toBeVisible()

    // Should NOT see enduser navigation
    await expect(page.getByText('My Tasks')).not.toBeVisible()
    
    // Should NOT see official navigation
    await expect(page.getByText('Personnel Lookup')).not.toBeVisible()

    // Test accessing admin routes directly
    await page.goto('http://localhost:5173/admin/personnel')
    await expect(page).toHaveURL(/.*\/admin\/personnel/)
    await expect(page.getByText('Personnel Management')).toBeVisible()

    await page.goto('http://localhost:5173/admin/organizations')
    await expect(page).toHaveURL(/.*\/admin\/organizations/)
  })

  test('Admin user cannot access enduser routes', async ({ page }) => {
    await loginAsRole(page, TEST_CREDENTIALS.admin.username, TEST_CREDENTIALS.admin.password)
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Try to access enduser route
    await page.goto('http://localhost:5173/enduser/tasks')
    
    // Should be redirected to admin dashboard (default route for admin)
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
  })

  test('Admin user cannot access official routes', async ({ page }) => {
    await loginAsRole(page, TEST_CREDENTIALS.admin.username, TEST_CREDENTIALS.admin.password)
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Try to access official route
    await page.goto('http://localhost:5173/official/dashboard')
    
    // Should be redirected to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
  })
})

test.describe('Login Redirects', () => {
  test('Admin login redirects to /admin/dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    
    await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.username)
    await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password)
    await page.click('button[type="submit"]')
    
    // Wait for redirect
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 })
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
  })

  test('Root route redirects based on role', async ({ page }) => {
    // Test admin
    await loginAsRole(page, TEST_CREDENTIALS.admin.username, TEST_CREDENTIALS.admin.password)
    await page.goto('http://localhost:5173/')
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 5000 })
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
  })
})

test.describe('Navigation Display', () => {
  test('Admin sees correct navigation items', async ({ page }) => {
    await loginAsRole(page, TEST_CREDENTIALS.admin.username, TEST_CREDENTIALS.admin.password)
    await page.goto('http://localhost:5173/admin/dashboard')
    await page.waitForLoadState('networkidle')

    // Check header subtitle
    await expect(page.getByText('Security Clearance Management')).toBeVisible()

    // Check navigation items
    const navItems = [
      'Dashboard',
      'Personnel',
      'Organizations',
      'Info Systems',
      'Access Control',
      'NDAs',
      'Audit Logs',
      'Roles',
    ]

    for (const item of navItems) {
      await expect(page.getByText(item)).toBeVisible()
    }
  })

  test('Profile dropdown navigates to role-specific profile', async ({ page }) => {
    await loginAsRole(page, TEST_CREDENTIALS.admin.username, TEST_CREDENTIALS.admin.password)
    await page.goto('http://localhost:5173/admin/dashboard')
    await page.waitForLoadState('networkidle')

    // Click profile dropdown
    await page.locator('button:has-text("admin")').click()
    
    // Click Profile Settings
    await page.getByText('Profile Settings').click()
    
    // Should navigate to admin profile
    await expect(page).toHaveURL(/.*\/admin\/profile/)
    await expect(page.getByText('Profile Settings')).toBeVisible()
  })
})

test.describe('Unauthenticated Access', () => {
  test('Unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('Unauthenticated user cannot access protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/admin/dashboard',
      '/enduser/tasks',
      '/official/dashboard',
    ]

    for (const route of protectedRoutes) {
      await page.goto(`http://localhost:5173${route}`)
      await expect(page).toHaveURL(/.*\/login/)
    }
  })
})

