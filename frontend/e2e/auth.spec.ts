import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

test.describe("Authentication", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await loginViaUI(page);

    // Admin lands on the dashboard
    await expect(page).toHaveURL("/admin/dashboard");

    // Profile dropdown trigger shows the username, proving we are logged in
    await expect(page.locator('button:has-text("admin")')).toBeVisible();
  });

  test("should show error message with invalid credentials", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill('[name="username"]', "admin");
    await page.fill('[name="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Error renders in a div.bg-destructive/10 (no role=alert)
    await page.waitForSelector(".bg-destructive\\/10", { timeout: 5000 });

    // Should stay on login page
    await expect(page).toHaveURL("/login");
  });

  test("should logout successfully", async ({ page }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL("/admin/dashboard");

    // Logout lives inside the profile dropdown as a menuitem
    await page.locator('button:has-text("admin")').click();
    await page.getByRole("menuitem", { name: /logout/i }).click();

    // Should redirect to login (ProtectedRoute appends a ?redirect param)
    await expect(page).toHaveURL(/\/login/);
  });

  test("should persist authentication across page reloads", async ({
    page,
  }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL("/admin/dashboard");

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL("/admin/dashboard");
    await expect(page.locator('button:has-text("admin")')).toBeVisible();
  });
});
