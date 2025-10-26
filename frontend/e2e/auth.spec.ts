import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in credentials
    await page.fill('[name="username"]', 'admin')
    await page.fill('[name="password"]', 'password123')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to personnel page
    await expect(page).toHaveURL('/personnel', { timeout: 10000 })
    
    // Should show user info in header (use role selector)
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
  })

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[name="username"]', 'admin')
    await page.fill('[name="password"]', 'wrongpassword')
    
    await page.click('button[type="submit"]')
    
    // Should show error message (wait for it to appear)
    await page.waitForSelector('.bg-destructive\\/10, [role="alert"], .text-destructive', { timeout: 5000 })
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[name="username"]', 'admin')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/personnel')
    
    // Click logout button
    await page.getByRole('button', { name: /logout/i }).click()
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="username"]', 'admin')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/personnel', { timeout: 10000 })
    
    // Reload page
    await page.reload()
    
    // Should still be authenticated
    await expect(page).toHaveURL('/personnel')
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
  })
})

