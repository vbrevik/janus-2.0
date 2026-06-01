import { test, expect } from "@playwright/test";
import { loginViaApi } from "./helpers/auth";

/**
 * E2E Tests for Navigation Flow
 * Tests navigation between pages for each role
 */

test.describe("Admin Navigation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("can navigate between admin pages", async ({ page }) => {
    // Scope clicks to the nav so labels don't collide with page headings/quick-links
    const nav = page.locator("nav");

    // Start at dashboard
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);

    // Navigate to Persons
    await nav.getByRole("link", { name: "Persons", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/person/);

    // Navigate to Organizations
    await nav.getByRole("link", { name: "Organizations", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/organizations/);

    // Navigate to Info Systems
    await nav.getByRole("link", { name: "Info Systems", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/info-systems/);

    // Navigate to Access Control
    await nav
      .getByRole("link", { name: "Access Control", exact: true })
      .click();
    await expect(page).toHaveURL(/.*\/admin\/access/);

    // Navigate to NDAs
    await nav.getByRole("link", { name: "NDAs", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/ndas/);

    // Navigate to Discussions
    await nav.getByRole("link", { name: "Discussions", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/discussions/);

    // Navigate to Audit Logs
    await nav.getByRole("link", { name: "Audit Logs", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/audit/);

    // Navigate to Roles
    await nav.getByRole("link", { name: "Roles", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/roles/);

    // Navigate back to Dashboard
    await nav.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test("logo link navigates to dashboard", async ({ page }) => {
    await page.goto("/admin/person");

    // Click logo
    await page.click("text=Janus 2.0");

    // Should navigate to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test("navigation items are highlighted when active", async ({ page }) => {
    await page.goto("/admin/dashboard");

    const nav = page.locator("nav");

    // Dashboard nav link should be active (scope to nav; logo also points here)
    const dashboardLink = nav.locator('a[href="/admin/dashboard"]');
    await expect(dashboardLink).toHaveAttribute("data-status", "active");

    // Navigate to Persons
    await nav.getByRole("link", { name: "Persons", exact: true }).click();
    await page.waitForURL(/.*\/admin\/person/);

    // Persons nav link should be active
    const personLink = nav.locator('a[href*="/admin/person"]').first();
    await expect(personLink).toHaveAttribute("data-status", "active");
  });
});

test.describe("Header and Profile Menu", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/admin/dashboard");
  });

  test("profile dropdown shows user info", async ({ page }) => {
    // Click profile dropdown
    const profileButton = page.locator('button:has-text("admin")');
    await profileButton.click();

    // Should show username and role
    await expect(page.getByText("admin").first()).toBeVisible();
  });

  test("profile dropdown links work", async ({ page }) => {
    // Click profile dropdown
    await page.locator('button:has-text("admin")').click();

    // Click Profile Settings
    await page.getByText("Profile Settings").click();
    await expect(page).toHaveURL(/.*\/admin\/profile/);

    // Go back to dashboard
    await page.goto("/admin/dashboard");
    await page.locator('button:has-text("admin")').click();

    // Click Change Password
    await page.getByText("Change Password").click();
    await expect(page).toHaveURL(/.*\/admin\/profile/);
    // Change Password adds a change param (TanStack serializes the string as change=%221%22)
    await expect(page).toHaveURL(/change=/);
  });

  test("logout works", async ({ page }) => {
    // Click profile dropdown
    await page.locator('button:has-text("admin")').click();

    // Click Logout
    await page.getByText("Logout").click();

    // Should redirect to login (ProtectedRoute kicks out once auth state clears)
    await expect(page).toHaveURL(/.*\/login/);

    // Try to access protected route
    await page.goto("/admin/dashboard");

    // Should redirect back to login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
