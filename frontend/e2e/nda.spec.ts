import { test, expect } from '@playwright/test'

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/personnel', { timeout: 10000 })
}

test.describe('NDA Management - Sign and Reject', () => {
  let testPersonnelId: number
  let testPersonnelEmail: string
  let adminToken: string

  test.beforeEach(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post('http://localhost:15520/api/auth/login', {
      data: {
        username: 'admin',
        password: 'password123'
      }
    })
    
    const loginData = await loginResponse.json()
    adminToken = loginData.token || loginData.data?.token
    const authHeader = { Authorization: `Bearer ${adminToken}` }

    // Find or create a test personnel for NDA testing
    const personnelListResponse = await request.get('http://localhost:15520/api/personnel?per_page=100', {
      headers: authHeader
    })
    const personnelData = await personnelListResponse.json()
    
    // Find existing personnel with email (from seed data)
    const existingPersonnel = personnelData.data?.items?.find((p: any) => 
      p.email?.includes('@example.com')
    )

    if (existingPersonnel) {
      testPersonnelId = existingPersonnel.id
      testPersonnelEmail = existingPersonnel.email
    } else {
      // Create new personnel for testing
      const createResponse = await request.post('http://localhost:15520/api/personnel', {
        headers: authHeader,
        data: {
          first_name: 'NDA',
          last_name: 'TestUser',
          email: `nda.test.${Date.now()}@example.com`,
          clearance_level: 'CONFIDENTIAL',
          department: 'Testing',
          position: 'Test Engineer'
        }
      })
      const newPersonnel = await createResponse.json()
      testPersonnelId = newPersonnel.data.id
      testPersonnelEmail = newPersonnel.data.email
    }
  })

  test('Admin can send NDA to personnel', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to personnel details
    await page.goto(`/personnel/${testPersonnelId}`)

    // Click on NDAs tab
    await page.click('button:has-text("NDAs")')
    await page.waitForTimeout(1000)

    // Click "Send NDA" button
    await page.click('button:has-text("Send NDA")')
    await page.waitForTimeout(500)

    // Fill NDA form
    const timestamp = Date.now()
    await page.fill('input[id="nda-title"]', `Test NDA ${timestamp}`)
    await page.fill('textarea[id="nda-content"]', 'This is a test NDA for automated testing. Please review and sign.')
    await page.fill('input[id="nda-version"]', '1.0')
    
    // Submit form
    await page.click('button:has-text("Send NDA")')
    await page.waitForTimeout(2000)

    // Verify NDA appears in list
    await expect(page.getByText(`Test NDA ${timestamp}`)).toBeVisible({ timeout: 5000 })
    
    // Store NDA ID for later tests (extract from the page or API)
    // For now, we'll find it by title in subsequent tests
  })

  test('Enduser can sign NDA via API', async ({ request }) => {
    // Create an NDA for signing test
    const timestamp = Date.now()
    const createNdaResponse = await request.post('http://localhost:15520/api/nda', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        personnel_id: testPersonnelId,
        title: `Sign Test NDA ${timestamp}`,
        content: 'This NDA should be signed for testing purposes.',
        version: '1.0',
        sent_by_organization_id: null
      }
    })
    
    expect(createNdaResponse.ok()).toBeTruthy()
    const ndaData = await createNdaResponse.json()
    const ndaId = ndaData.data.id
    expect(ndaId).toBeTruthy()

    // Sign the NDA (simulating enduser action)
    const signResponse = await request.post(`http://localhost:15520/api/nda/${ndaId}/sign`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        signature: `Signed by Test User at ${new Date().toISOString()}`
      }
    })
    
    expect(signResponse.ok()).toBeTruthy()
    const signedNda = await signResponse.json()
    
    // Verify NDA is signed
    expect(signedNda.data.status).toBe('SIGNED')
    expect(signedNda.data.signed_at).toBeTruthy()
    expect(signedNda.data.signature).toBeTruthy()
    
    // Verify via GET request
    const verifyResponse = await request.get(
      `http://localhost:15520/api/nda/${ndaId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )
    const verifiedNda = await verifyResponse.json()
    expect(verifiedNda.data.status).toBe('SIGNED')
    expect(verifiedNda.data.signed_at).toBeTruthy()
  })

  test('Enduser can reject NDA via API', async ({ request }) => {
    // Create an NDA for rejection test
    const timestamp = Date.now()
    const createNdaResponse = await request.post('http://localhost:15520/api/nda', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        personnel_id: testPersonnelId,
        title: `Reject Test NDA ${timestamp}`,
        content: 'This NDA should be rejected for testing purposes.',
        version: '1.0'
      }
    })
    
    expect(createNdaResponse.ok()).toBeTruthy()
    const ndaData = await createNdaResponse.json()
    const ndaId = ndaData.data.id
    expect(ndaId).toBeTruthy()

    // Reject the NDA (simulating enduser action)
    const rejectionReason = `Test rejection reason ${timestamp} - NDA content is unclear and does not meet requirements`
    const rejectResponse = await request.post(`http://localhost:15520/api/nda/${ndaId}/reject`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        reason: rejectionReason
      }
    })
    
    expect(rejectResponse.ok()).toBeTruthy()
    const rejectedNda = await rejectResponse.json()
    
    // Verify NDA is rejected
    expect(rejectedNda.data.rejection_reason).toBe(rejectionReason)
    expect(rejectedNda.data.status).toBe('REVOKED')
    
    // Verify via GET request
    const verifyResponse = await request.get(
      `http://localhost:15520/api/nda/${ndaId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )
    const verifiedNda = await verifyResponse.json()
    expect(verifiedNda.data.rejection_reason).toBe(rejectionReason)
    expect(verifiedNda.data.status).toBe('REVOKED')
  })

  test('Admin can see NDA with sent metadata', async ({ page, request }) => {
    // Create an NDA with organization attribution
    const timestamp = Date.now()
    
    // First, get a organization ID
    const organizationsResponse = await request.get('http://localhost:15520/api/organizations?per_page=10', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    const organizationsData = await organizationsResponse.json()
    const organizationId = organizationsData.data?.items?.[0]?.id || null

    const createNdaResponse = await request.post('http://localhost:15520/api/nda', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        personnel_id: testPersonnelId,
        title: `Organization NDA ${timestamp}`,
        content: 'This NDA was sent by a organization for testing.',
        version: '1.0',
        sent_by_organization_id: organizationId
      }
    })
    
    expect(createNdaResponse.ok()).toBeTruthy()
    const ndaData = await createNdaResponse.json()
    
    // Verify metadata was set
    expect(ndaData.data.sent_by_organization_id).toBe(organizationId)
    expect(ndaData.data.sent_at).toBeTruthy()

    // Test UI view
    await loginAsAdmin(page)
    await page.goto(`/personnel/${testPersonnelId}`)
    await page.click('button:has-text("NDAs")')
    await page.waitForTimeout(1000)

    // Verify NDA appears with metadata
    await expect(page.getByText(`Organization NDA ${timestamp}`)).toBeVisible({ timeout: 5000 })
  })

  test('Admin UI shows NDA list with metadata', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to personnel details
    await page.goto(`/personnel/${testPersonnelId}`)

    // Click on NDAs tab
    await page.click('button:has-text("NDAs")')
    await page.waitForTimeout(2000)

    // Verify NDA tab is visible
    await expect(page.getByText(/non-disclosure agreements/i)).toBeVisible({ timeout: 5000 })
  })
})

