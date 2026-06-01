import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test("should navigate between all pages", async ({ page }) => {
    // Start at the admin dashboard
    await expect(page).toHaveURL("/admin/dashboard");

    // Scope clicks to the top nav so dashboard Quick Links don't cause
    // strict-mode collisions (e.g. "Manage Organizations").
    const nav = page.locator("nav");

    // Navigate to organizations
    await nav.getByRole("link", { name: /organizations/i }).click();
    await expect(page).toHaveURL("/admin/organizations");
    await expect(
      page.getByRole("heading", { name: /organization management/i }),
    ).toBeVisible();

    // Navigate to access control
    await nav.getByRole("link", { name: /access control/i }).click();
    await expect(page).toHaveURL("/admin/access");
    await expect(
      page.getByRole("heading", { name: /access control/i }),
    ).toBeVisible();

    // Navigate to audit logs
    await nav.getByRole("link", { name: /audit logs/i }).click();
    await expect(page).toHaveURL("/admin/audit");
    await expect(
      page.getByRole("heading", { name: /audit logs/i }),
    ).toBeVisible();

    // Navigate to persons
    await nav.getByRole("link", { name: /^persons$/i }).click();
    await expect(page).toHaveURL("/admin/person");
    await expect(
      page.getByRole("heading", { name: /person management/i }),
    ).toBeVisible();
  });

  test("should highlight active navigation item", async ({ page }) => {
    await page.goto("/admin/person");
    await page.waitForURL("/admin/person");

    // The Persons nav link should be marked active by TanStack (data-status="active")
    const personsLink = page.locator('a[href="/admin/person"]');
    await expect(personsLink).toBeVisible();
    await expect(personsLink).toHaveAttribute("data-status", "active");

    // Navigate to organizations
    await page
      .locator("nav")
      .getByRole("link", { name: /^organizations$/i })
      .click();
    await page.waitForURL("/admin/organizations");

    // Organizations link should now be the active one
    const organizationsLink = page.locator('a[href="/admin/organizations"]');
    await expect(organizationsLink).toBeVisible();
    await expect(organizationsLink).toHaveAttribute("data-status", "active");
    await expect(page).toHaveURL("/admin/organizations");
  });

  test("should show user info in header", async ({ page }) => {
    // The profile dropdown trigger shows the username, proving the user is logged in
    await expect(page.locator('button:has-text("admin")')).toBeVisible();
  });
});
