import { test, expect } from "@playwright/test";
import { loginViaApi } from "./helpers/auth";

/**
 * E2E Tests for Role-Based Routing
 * Tests route guards, navigation, and access control for all roles
 */

const TEST_CREDENTIALS = {
  admin: { username: "admin", password: "password123" },
  // APP GAP: no enduser/official seed users exist — see test.fixme below.
  enduser: { username: "enduser", password: "password123" },
  official: { username: "official", password: "password123" },
};

test.describe("Role-Based Route Guards", () => {
  test("Admin user can access admin routes", async ({ page }) => {
    // Login as admin
    await loginViaApi(
      page,
      TEST_CREDENTIALS.admin.username,
      TEST_CREDENTIALS.admin.password,
    );
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);

    // Should see admin navigation items (scope to nav; labels collide with page headings)
    const nav = page.locator("nav");
    await expect(nav.getByText("Dashboard")).toBeVisible();
    await expect(nav.getByText("Persons")).toBeVisible();
    await expect(nav.getByText("Organizations")).toBeVisible();
    await expect(nav.getByText("Info Systems")).toBeVisible();
    await expect(nav.getByText("Access Control")).toBeVisible();
    await expect(nav.getByText("NDAs")).toBeVisible();
    await expect(nav.getByText("Audit Logs")).toBeVisible();
    await expect(nav.getByText("Roles")).toBeVisible();

    // Should NOT see enduser navigation
    await expect(page.getByText("My Tasks")).not.toBeVisible();

    // Should NOT see official navigation
    await expect(page.getByText("Person Lookup")).not.toBeVisible();

    // Test accessing admin routes directly
    await page.goto("/admin/person");
    await expect(page).toHaveURL(/.*\/admin\/person/);
    await expect(page.getByText("Person Management")).toBeVisible();

    await page.goto("/admin/organizations");
    await expect(page).toHaveURL(/.*\/admin\/organizations/);
  });

  test("Admin user cannot access enduser routes", async ({ page }) => {
    await loginViaApi(
      page,
      TEST_CREDENTIALS.admin.username,
      TEST_CREDENTIALS.admin.password,
    );
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Try to access enduser route
    await page.goto("/enduser/tasks");

    // Should be redirected to admin dashboard (default route for admin)
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test("Admin user cannot access official routes", async ({ page }) => {
    await loginViaApi(
      page,
      TEST_CREDENTIALS.admin.username,
      TEST_CREDENTIALS.admin.password,
    );
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Try to access official route
    await page.goto("/official/dashboard");

    // Should be redirected to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });
});

test.describe("Login Redirects", () => {
  test("Admin login redirects to /admin/dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.username);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test("Root route redirects based on role", async ({ page }) => {
    // Test admin
    await loginViaApi(
      page,
      TEST_CREDENTIALS.admin.username,
      TEST_CREDENTIALS.admin.password,
    );
    await page.goto("/");
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test("Enduser login redirects to /enduser/tasks", async ({ page }) => {
    await loginViaApi(
      page,
      TEST_CREDENTIALS.enduser.username,
      TEST_CREDENTIALS.enduser.password,
    );
    await page.goto("/");
    await page.waitForURL(/.*\/enduser\/tasks/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/enduser\/tasks/);
  });

  test("Official login redirects to /official/dashboard", async ({ page }) => {
    await loginViaApi(
      page,
      TEST_CREDENTIALS.official.username,
      TEST_CREDENTIALS.official.password,
    );
    await page.goto("/");
    await page.waitForURL(/.*\/official\/dashboard/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/official\/dashboard/);
  });
});

test.describe("Navigation Display", () => {
  test("Admin sees correct navigation items", async ({ page }) => {
    await loginViaApi(
      page,
      TEST_CREDENTIALS.admin.username,
      TEST_CREDENTIALS.admin.password,
    );
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("networkidle");

    // Check header subtitle
    await expect(page.getByText("Security Clearance Management")).toBeVisible();

    // Check navigation items
    const navItems = [
      "Dashboard",
      "Persons",
      "Organizations",
      "Info Systems",
      "Access Control",
      "NDAs",
      "Discussions",
      "Audit Logs",
      "Roles",
    ];

    const nav = page.locator("nav");
    for (const item of navItems) {
      await expect(nav.getByText(item)).toBeVisible();
    }
  });

  test("Profile dropdown navigates to role-specific profile", async ({
    page,
  }) => {
    await loginViaApi(
      page,
      TEST_CREDENTIALS.admin.username,
      TEST_CREDENTIALS.admin.password,
    );
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("networkidle");

    // Click profile dropdown
    await page.locator('button:has-text("admin")').click();

    // Click Profile Settings
    await page.getByText("Profile Settings").click();

    // Should navigate to admin profile
    await expect(page).toHaveURL(/.*\/admin\/profile/);
  });
});

test.describe("Unauthenticated Access", () => {
  test("Unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/admin/dashboard");

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("Unauthenticated user cannot access protected routes", async ({
    page,
  }) => {
    const protectedRoutes = [
      "/admin/dashboard",
      "/enduser/tasks",
      "/official/dashboard",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });
});
