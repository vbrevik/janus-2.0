import { test, expect } from '@playwright/test'

async function login(page, username: string, password: string) {
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /login/i }).click()
  await expect(page.getByText(/dashboard/i)).toBeVisible()
}

test.describe('Audit Logs (Admin)', () => {
  test('loads list and shows rows', async ({ page }) => {
    await login(page, 'admin', 'password123')
    await page.goto('/audit')
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible()
    // Table renders (may be empty initially, but table header exists)
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible()
  })

  test('RBAC: viewer cannot access audit logs', async ({ page }) => {
    await login(page, 'viewer', 'password123')
    await page.goto('/audit')
    // Expect error message from API forbidden; page should show failure state
    await expect(page.getByText(/failed to load audit logs/i)).toBeVisible()
  })
})


