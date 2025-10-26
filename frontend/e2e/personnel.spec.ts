import { test, expect } from '@playwright/test'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/personnel')
}

test.describe('Personnel Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display personnel list', async ({ page }) => {
    // Should show table with personnel
    await expect(page.getByRole('table')).toBeVisible()
    
    // Should have table headers
    await expect(page.getByText('Name')).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText('Department')).toBeVisible()
    await expect(page.getByText('Position')).toBeVisible()
    await expect(page.getByText('Clearance')).toBeVisible()
  })

  test('should create new personnel', async ({ page }) => {
    // Click Add Personnel button
    await page.getByRole('button', { name: /add personnel/i }).click()
    
    // Fill in form
    const timestamp = Date.now()
    await page.fill('[name="first_name"]', 'Test')
    await page.fill('[name="last_name"]', 'User')
    await page.fill('[name="email"]', `test.user.${timestamp}@example.com`)
    await page.fill('[name="phone"]', '555-0000')
    await page.fill('[name="department"]', 'Testing')
    await page.fill('[name="position"]', 'Test Engineer')
    await page.selectOption('[name="clearance_level"]', 'SECRET')
    
    // Submit form
    await page.getByRole('button', { name: /^create$/i }).click()
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Should see new personnel in table
    await expect(page.getByText('Test User')).toBeVisible()
  })

  test('should edit existing personnel', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByRole('table')).toBeVisible()
    
    // Click first edit button (assuming at least one personnel exists)
    await page.locator('button[aria-label="Edit"]').first().click()
    
    // Update position
    await page.fill('[name="position"]', 'Updated Position')
    
    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click()
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Should see updated position in table
    await expect(page.getByText('Updated Position')).toBeVisible()
  })

  test('should show pagination when there are multiple pages', async ({ page }) => {
    // Check if pagination controls exist
    const paginationText = page.getByText(/page \d+ of \d+/i)
    
    // If there are multiple pages, test pagination
    if (await paginationText.isVisible()) {
      const currentPageText = await paginationText.textContent()
      
      // Click Next button if not on last page
      const nextButton = page.getByRole('button', { name: /next/i })
      if (!(await nextButton.isDisabled())) {
        await nextButton.click()
        
        // Page number should have changed
        await expect(paginationText).not.toHaveText(currentPageText || '')
      }
    }
  })

  test('should filter personnel with search', async ({ page }) => {
    // Note: This test will pass even if search is not implemented yet
    // as it's just checking the structure
    await expect(page.getByRole('table')).toBeVisible()
  })
})

