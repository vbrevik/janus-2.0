import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

test.describe("Roles & Permissions Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test("should display roles list", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.waitForURL("**/admin/roles");

    // Page heading
    await expect(
      page.getByRole("heading", { name: "Roles & Permissions" }),
    ).toBeVisible({ timeout: 10000 });

    // Roles table with headers
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });
    // Header <th> cells (role engine varies; assert by tag for stability)
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Description" })).toBeVisible();
  });

  test("should create new role", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.waitForURL("**/admin/roles");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Open the Create Role dialog
    await page.getByRole("button", { name: "Create Role" }).click();

    // Dialog inputs (real ids from the component)
    const timestamp = Date.now();
    const roleName = `testrole${timestamp}`;
    await page.locator("input#role-name").fill(roleName);
    await page.locator("input#role-description").fill("Test role description");

    // Submit — the dialog's submit button is also labelled "Create Role"
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create Role" })
      .click();

    // New role should appear in the table
    await expect(page.getByRole("cell", { name: roleName })).toBeVisible({
      timeout: 10000,
    });
  });

  test("should edit existing role", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.waitForURL("**/admin/roles");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Each non-empty role row has an icon-only edit button followed by a
    // delete button; the edit button is the 2nd ghost action button in the row.
    // Scope to the first data row and click its edit (pencil) button.
    const firstRow = page.getByRole("row").nth(1);
    // The edit button is the middle action button (Permissions | Edit | Delete).
    const editButton = firstRow.getByRole("button").nth(1);
    await editButton.click();

    // Inline edit inputs appear in the row; update the description field.
    const descInput = firstRow.getByPlaceholder("Description (optional)");
    await expect(descInput).toBeVisible({ timeout: 5000 });
    await descInput.fill("Updated description");

    // Save inline edit
    await firstRow.getByRole("button", { name: "Save" }).click();

    // Row returns to display mode (Save button gone)
    await expect(firstRow.getByRole("button", { name: "Save" })).toHaveCount(
      0,
      { timeout: 10000 },
    );
  });

  test("should open permissions dialog", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.waitForURL("**/admin/roles");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Open Permissions dialog for the first role
    await page.getByRole("button", { name: "Permissions" }).first().click();

    // Dialog opens with the management title
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Manage Permissions:/i)).toBeVisible();

    // shadcn/Radix renders checkboxes with role="checkbox" (not input[type=checkbox])
    await expect(dialog.getByRole("checkbox").first()).toBeVisible();
  });

  test("should assign permissions to role", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.waitForURL("**/admin/roles");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Open Permissions dialog for the first role
    await page.getByRole("button", { name: "Permissions" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Each permission is an sr-only <input> inside a styled switch <label>.
    // Click the visible label (the hidden input itself is not actionable).
    const firstToggle = dialog.locator("label.cursor-pointer").first();
    await expect(firstToggle).toBeVisible();
    await firstToggle.click();

    // Save permissions — real button label is "Save Permissions"
    await dialog.getByRole("button", { name: "Save Permissions" }).click();

    // Dialog should close after save
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("should navigate to roles from navigation", async ({ page }) => {
    // Start from the admin landing route
    await page.goto("/admin/dashboard");
    await page.waitForURL("**/admin/dashboard");

    // Click the 'Roles' nav link (real label/route from layout.tsx)
    await page.getByRole("link", { name: "Roles" }).click();

    // Should land on the namespaced roles route
    await page.waitForURL("**/admin/roles");
    await expect(page).toHaveURL(/\/admin\/roles$/);
    await expect(
      page.getByRole("heading", { name: "Roles & Permissions" }),
    ).toBeVisible();
  });
});
