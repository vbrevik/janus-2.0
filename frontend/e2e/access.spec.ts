import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

// App reality (admin/access/index.tsx):
// - Route is /admin/access; page renders an <h1>Access Control</h1>.
// - Three cards expose grant buttons. Clicking a button does NOT open a
//   dialog/modal — it toggles an INLINE form inside the same card
//   (openSection state). There are no <h2> dialog titles.
// - Button labels: 'Grant Information Systems Access' (computer),
//   'Grant Data Access' (data), 'Grant Physical Access' (physical).

test.describe("Access Control", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test("should display access control page", async ({ page }) => {
    await page.goto("/admin/access");
    await page.waitForURL("**/admin/access");

    await expect(
      page.getByRole("heading", { name: /access control/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should open computer (information systems) access form", async ({
    page,
  }) => {
    await page.goto("/admin/access");

    const grantButton = page.getByRole("button", {
      name: "Grant Information Systems Access",
    });
    await expect(grantButton).toBeVisible();
    await grantButton.click();

    // Inline form replaces the button: the access-level select offers ADMIN.
    await expect(
      page.getByRole("button", { name: "Grant Access" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText("Information System", { exact: true }),
    ).toBeVisible();
  });

  test("should open data access form", async ({ page }) => {
    await page.goto("/admin/access");

    const grantButton = page.getByRole("button", { name: "Grant Data Access" });
    await expect(grantButton).toBeVisible();
    await grantButton.click();

    await expect(
      page.getByRole("button", { name: "Grant Access" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Data Classification")).toBeVisible();
  });

  test("should open physical access form", async ({ page }) => {
    await page.goto("/admin/access");

    const grantButton = page.getByRole("button", {
      name: "Grant Physical Access",
    });
    await expect(grantButton).toBeVisible();
    await grantButton.click();

    await expect(
      page.getByRole("button", { name: "Grant Access" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Zone Name")).toBeVisible();
  });

  test("should navigate to access control from main navigation", async ({
    page,
  }) => {
    // beforeEach lands on /admin/dashboard.
    await page.waitForURL("**/admin/dashboard");

    await page.getByRole("link", { name: "Access Control" }).click();

    await expect(page).toHaveURL(/\/admin\/access$/);
  });
});
