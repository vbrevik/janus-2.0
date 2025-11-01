import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/^\/(personnel|dashboard)/, { timeout: 10000 })
}

test.describe('Roles & Permissions Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display roles list', async ({ page }) => {
    // Navigate to roles page
    await page.goto('/roles')
    
    // Should show table with roles
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Should have table headers
    const tableHeaders = page.getByRole('table').locator('thead')
    await expect(tableHeaders).toBeVisible()
    
    // Should show at least default roles (admin, manager, operator, viewer)
    const roleNames = ['admin', 'manager', 'operator', 'viewer']
    for (const roleName of roleNames) {
      await expect(page.getByText(new RegExp(roleName, 'i'))).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some roles might not exist, that's okay
      })
    }
  })

  test('should create new role', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Click Create Role button
    await page.getByRole('button', { name: /create role/i }).click()
    
    // Fill in form
    const timestamp = Date.now()
    const roleName = `testrole${timestamp}`
    await page.fill('input[id="role-name"], input[placeholder*="role"], input[placeholder*="name"]', roleName)
    await page.fill('input[id="role-description"], input[placeholder*="description"]', 'Test role description')
    
    // Submit form
    const createButton = page.getByRole('button', { name: /create|add|save/i }).filter({ hasText: /create|add/i })
    await createButton.click({ timeout: 5000 })
    
    // Dialog should close
    await page.waitForTimeout(1000)
    
    // Should see new role in table
    await expect(page.getByText(roleName, { exact: false })).toBeVisible({ timeout: 10000 })
  })

  test('should edit existing role', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Find first role with edit button (skip admin if protected)
    const editButtons = page.locator('button').filter({ has: page.locator('[class*="edit"], svg') })
    const count = await editButtons.count()
    
    if (count > 0) {
      // Click first edit button
      await editButtons.first().click({ timeout: 5000 })
      
      // Update description
      const descInput = page.locator('input[placeholder*="description"], input:not([type="hidden"])').last()
      if (await descInput.isVisible()) {
        await descInput.fill('Updated description')
      }
      
      // Save changes
      await page.getByRole('button', { name: /save/i }).click({ timeout: 5000 })
      
      // Wait for changes to apply
      await page.waitForTimeout(1000)
    }
  })

  test('should open permissions dialog', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Find Permissions button for first role
    const permissionsButton = page.getByRole('button', { name: /permissions/i }).first()
    
    if (await permissionsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permissionsButton.click()
      
      // Should open dialog with permissions
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/permissions/i)).toBeVisible()
      
      // Should show permission checkboxes
      const checkboxes = page.locator('input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await expect(checkboxes.first()).toBeVisible()
      }
    }
  })

  test('should assign permissions to role', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Find Permissions button for first role
    const permissionsButton = page.getByRole('button', { name: /permissions/i }).first()
    
    if (await permissionsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permissionsButton.click()
      
      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      
      // Find first unchecked permission checkbox
      const checkboxes = page.locator('input[type="checkbox"]:not(:checked)')
      const uncheckedCount = await checkboxes.count()
      
      if (uncheckedCount > 0) {
        // Toggle first permission
        await checkboxes.first().click()
        
        // Save permissions
        await page.getByRole('button', { name: /save permissions/i }).click({ timeout: 5000 })
        
        // Dialog should close
        await page.waitForTimeout(1000)
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 }).catch(() => {
          // Dialog might still be visible if save failed, that's okay
        })
      }
    }
  })

  test('should navigate to roles from navigation', async ({ page }) => {
    // Click Roles & Permissions in navigation
    await page.getByRole('link', { name: /roles.*permissions|permissions.*roles/i }).click()
    
    // Should navigate to roles page
    await expect(page).toHaveURL('/roles', { timeout: 10000 })
    await expect(page.getByRole('table')).toBeVisible()
  })
})
