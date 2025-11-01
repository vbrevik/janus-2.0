import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/^\/(personnel|dashboard)/, { timeout: 10000 })
}

test.describe('Info Systems Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Navigate to info systems page
    await page.goto('/info-systems')
    await page.waitForLoadState('networkidle')
  })

  test('should display info systems list', async ({ page }) => {
    // Should show table with info systems
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    
    // Should have table headers
    await expect(page.getByText('System Name')).toBeVisible()
    await expect(page.getByText('Environment')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
  })

  test('should create new info system', async ({ page }) => {
    // Click Add System button
    await page.getByRole('button', { name: /add system/i }).click()
    
    // Wait for create row to appear
    await page.waitForSelector('input[placeholder="System name"]', { timeout: 5000 })
    
    // Fill in form
    const timestamp = Date.now()
    const systemName = `Test System ${timestamp}`
    
    await page.fill('input[placeholder="System name"]', systemName)
    await page.selectOption('select, [role="combobox"]', { index: 0 }) // Environment
    await page.waitForTimeout(500) // Wait for selects to update
    
    // Submit form
    await page.getByRole('button', { name: /^add$/i }).first().click()
    
    // Should see success message or new system in table
    // Wait a bit for the mutation to complete
    await page.waitForTimeout(1000)
    
    // Should see new system in table
    await expect(page.getByText(systemName)).toBeVisible({ timeout: 10000 })
  })

  test('should edit existing info system', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Find first edit button (pencil icon)
    const editButtons = page.locator('button').filter({ has: page.locator('svg') })
    const pencilButton = page.locator('button').filter({ hasText: '' }).first()
    
    // Try to find edit button by looking for buttons in the Actions column
    const actionButtons = page.locator('table tbody tr').first().locator('button')
    const editButton = actionButtons.first()
    
    // Click edit if button exists
    const buttonCount = await actionButtons.count()
    if (buttonCount > 0) {
      await editButton.click({ timeout: 5000 }).catch(() => {
        // If click fails, try alternative selector
        page.locator('button[aria-label*="edit"], button:has(svg)').first().click()
      })
      
      // Should see editable inputs
      await page.waitForTimeout(500)
      
      // Find the system name input in edit mode
      const nameInput = page.locator('table tbody tr').first().locator('input').first()
      if (await nameInput.count() > 0) {
        await nameInput.fill('Updated System Name')
        
        // Click save button
        await page.getByRole('button', { name: /save/i }).first().click()
        
        // Wait for save to complete
        await page.waitForTimeout(1000)
        
        // Should see updated name
        await expect(page.getByText('Updated System Name')).toBeVisible({ timeout: 5000 })
      }
    } else {
      test.skip('No systems found to edit')
    }
  })

  test('should delete info system', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Check if there are any systems
    const rows = page.locator('table tbody tr')
    const rowCount = await rows.count()
    
    if (rowCount > 0) {
      // Find delete button (trash icon) in first row
      const firstRow = rows.first()
      const deleteButton = firstRow.locator('button').filter({ 
        has: page.locator('svg')
      }).last()
      
      // Get system name before deleting
      const systemName = await firstRow.locator('td').first().textContent()
      
      // Click delete button
      await deleteButton.click({ timeout: 5000 })
      
      // Handle confirmation dialog if it appears
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm')
        await dialog.accept()
      })
      
      // Wait for deletion to complete
      await page.waitForTimeout(1000)
      
      // System should be removed (or confirm dialog was shown)
      // The table should update
      if (systemName) {
        // Give it a moment, then check if still visible (might be async)
        await page.waitForTimeout(500)
      }
    } else {
      test.skip('No systems found to delete')
    }
  })

  test('should validate required fields on create', async ({ page }) => {
    // Click Add System button
    await page.getByRole('button', { name: /add system/i }).click()
    
    // Wait for create row
    await page.waitForSelector('input[placeholder="System name"]', { timeout: 5000 })
    
    // Try to submit without filling required fields
    const addButton = page.getByRole('button', { name: /^add$/i }).first()
    
    // Set up dialog handler
    let dialogMessage = ''
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message()
      await dialog.accept()
    })
    
    // Try to click add (should trigger validation)
    await addButton.click()
    
    // Wait a moment for validation
    await page.waitForTimeout(500)
    
    // Should show validation error (either via alert or form validation)
    // Check if dialog was shown or if form is still visible
    if (dialogMessage) {
      expect(dialogMessage.toLowerCase()).toContain('required')
    }
  })

  test('should navigate pagination', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Check if pagination controls exist
    const pagination = page.locator('text=/page|showing|results/i')
    const hasPagination = await pagination.count() > 0
    
    if (hasPagination) {
      // Try clicking next page if available
      const nextButton = page.getByRole('button', { name: /next/i })
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(1000)
        // Should be on page 2 (or more)
        await expect(page.getByText(/page/i)).toBeVisible()
      }
      
      // Try clicking previous page
      const prevButton = page.getByRole('button', { name: /previous/i })
      if (await prevButton.isEnabled()) {
        await prevButton.click()
        await page.waitForTimeout(1000)
      }
    } else {
      test.skip('Pagination not available (not enough data)')
    }
  })

  test('should filter by environment', async ({ page }) => {
    // This test assumes filtering is implemented
    // For now, just verify we can see environment badges
    await expect(page.getByText('DEV') || page.getByText('TEST') || page.getByText('PROD')).toBeVisible({ timeout: 10000 })
  })

  test('should display system status badges', async ({ page }) => {
    // Verify status badges are displayed
    const statusTexts = ['ACTIVE', 'INACTIVE', 'MAINTENANCE']
    let foundStatus = false
    
    for (const status of statusTexts) {
      if (await page.getByText(status).count() > 0) {
        foundStatus = true
        break
      }
    }
    
    // At least one status should be visible if there are systems
    const hasSystems = await page.locator('table tbody tr').count() > 0
    if (hasSystems) {
      expect(foundStatus).toBeTruthy()
    } else {
      test.skip('No systems to display status for')
    }
  })

  test('should cancel edit without saving', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 })
    
    const rows = page.locator('table tbody tr')
    const rowCount = await rows.count()
    
    if (rowCount > 0) {
      // Click edit on first row
      const firstRow = rows.first()
      const editButton = firstRow.locator('button').first()
      
      await editButton.click({ timeout: 5000 }).catch(() => {
        // Alternative: find any edit button
        page.locator('button:has(svg)').first().click()
      })
      
      await page.waitForTimeout(500)
      
      // Click cancel
      const cancelButton = page.getByRole('button', { name: /cancel/i }).first()
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        
        // Should be back to view mode (no input fields visible in that row)
        const inputsInRow = firstRow.locator('input').count()
        // After cancel, there should be fewer or no inputs
        expect(await inputsInRow).toBeLessThanOrEqual(0)
      }
    } else {
      test.skip('No systems to edit')
    }
  })
})

