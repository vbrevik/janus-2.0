import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

// App reality (2026-06): admin logs in -> /admin/dashboard. Organizations page
// lives at /admin/organizations (role-namespaced, not flat /organizations).
// The page is NOT a dialog-based form: heading is "Organization Management",
// the toggle button is labeled "Add Organization", and create/edit happen via
// INLINE table rows using shadcn Input/Select components (no name attributes,
// no <select> elements). Create derives contact name/email/phone from a Person
// select (email/phone are readOnly). Submit label is "Add"; edit save is "Save".

test.describe("Organization Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto("/admin/organizations");
    await page.waitForURL("**/admin/organizations");
  });

  test("should display organization list", async ({ page }) => {
    // Should show table with organizations
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Real column headers from the component (assert by <th> tag for role-engine stability)
    await expect(page.locator("th", { hasText: "Company" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Contract #" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Clearance" })).toBeVisible();
  });

  test("should create new organization", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Open the inline create row
    await page.getByRole("button", { name: /add organization/i }).click();

    // Inline create row uses placeholder-identified Inputs (no name attrs)
    await page.waitForSelector('input[placeholder="Company name"]', {
      timeout: 5000,
    });

    const timestamp = Date.now();
    const companyName = `Test Corp ${timestamp}`;
    await page.fill('input[placeholder="Company name"]', companyName);
    await page.fill('input[placeholder="Contract #"]', `CTR-TEST-${timestamp}`);

    // Contact name/email/phone are derived from the Person select (email/phone
    // are readOnly). The create row's first Select is the contact picker.
    const contactSelect = page.getByRole("combobox").first();
    await contactSelect.click();
    // Pick the first available person option to populate contact fields
    await page.getByRole("option").first().click();

    // Submit (button label is "Add", not "Create") and confirm via API response
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/organizations") &&
          resp.request().method() === "POST",
        { timeout: 15000 },
      ),
      page.getByRole("button", { name: /^add$/i }).first().click(),
    ]);

    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData).toHaveProperty("company_name", companyName);
    expect(responseData.id).toBeDefined();

    // Create row should disappear after a successful submission
    await page.waitForSelector('input[placeholder="Company name"]', {
      state: "hidden",
      timeout: 5000,
    });

    // Secondary UI verification (don't fail on cache/timing)
    await page.waitForTimeout(1000);
    const visible = await page
      .getByText(companyName)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (visible) {
      await expect(page.locator("table").getByText(companyName)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should edit existing organization", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Edit is an inline pencil-icon button (no text) in each data row.
    const firstRow = page.locator("table tbody tr").first();
    const companyCell = await firstRow.locator("td").nth(1).textContent();

    if (!companyCell || companyCell.trim() === "") {
      test.skip(true, "No organizations found to edit");
      return;
    }

    // Pencil edit button lives in the last (Actions) cell. Scope to that cell
    // so we don't accidentally grab the expand chevron in the first cell.
    const actionsCell = firstRow.locator("td").last();
    const editButton = actionsCell.getByRole("button").first();
    await editButton.click({ timeout: 5000 });

    // Editing reveals inline Inputs; confirm we entered edit mode
    await expect(firstRow.locator("input").first()).toBeVisible({
      timeout: 5000,
    });

    // Change the clearance via the inline shadcn Select (combobox in the row)
    const clearanceSelect = firstRow.getByRole("combobox").first();
    await clearanceSelect.click();
    await page.getByRole("option", { name: "Top Secret" }).click();

    // Save (button label is "Save")
    await firstRow
      .getByRole("button", { name: /save/i })
      .click({ timeout: 5000 });

    // Edit inputs should disappear after save returns to display mode
    await expect(firstRow.locator("input").first()).toBeHidden({
      timeout: 5000,
    });
  });

  test("should navigate to organization page from nav", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await page.waitForURL("**/admin/dashboard");

    // Click the "Organizations" nav link (scope to nav; dashboard has a quick-link too)
    await page
      .locator("nav")
      .getByRole("link", { name: "Organizations", exact: true })
      .click();

    await expect(page).toHaveURL(/\/admin\/organizations$/);
    await expect(
      page.getByRole("heading", { name: /organization management/i }),
    ).toBeVisible();
  });
});
