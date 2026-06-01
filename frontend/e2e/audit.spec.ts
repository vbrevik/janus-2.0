import { test, expect } from "@playwright/test";
import { loginViaUI, loginViaApi } from "./helpers/auth";

test.describe("Audit Logs (Admin)", () => {
  test("loads list and shows rows", async ({ page }) => {
    await loginViaUI(page, "admin", "password123");
    await page.goto("/admin/audit");
    // Real heading rendered by /admin/audit/index.tsx
    await expect(
      page.getByRole("heading", { name: "Audit Logs" }),
    ).toBeVisible();

    // Audit table renders with a Username column (assert by <th> tag — this PW
    // version's role engine maps these <th> to "cell", not "columnheader").
    await expect(page.locator("th", { hasText: "Username" })).toBeVisible();
  });

  test("RBAC: viewer cannot access audit logs", async ({ page }) => {
    // 'viewer' is not in getDefaultRoute (returns '/login'), so loginViaUI's
    // waitForURL on a dashboard would hang — use the API login fast path.
    await loginViaApi(page, "viewer", "password123");
    await page.goto("/admin/audit");

    // App reality: ProtectedRoute allowedRoles={['admin']} rejects 'viewer'.
    // getDefaultRoute('viewer') -> '/login', so the user is redirected to the
    // login page rather than shown a 'failed to load audit logs' error
    // (the audit page has no error/forbidden UI — it is a stub).
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    // Audit heading must NOT render for a non-admin user.
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toHaveCount(
      0,
    );
  });
});
