import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

// App reality (post role-namespace pivot):
// - Login redirects to /admin/dashboard; there is NO /personnel route.
// - The personnel feature is now "Person Management" at /admin/person.
// - Create and edit are INLINE table rows (no dialog). shadcn <Input>
//   elements have no name attribute, so fields are targeted by placeholder.
// - Clearance is a Radix <Select> (combobox + listbox), not a native <select>.

test.describe("Person Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto("/admin/person");
  });

  test("should display person list", async ({ page }) => {
    // Heading and table render
    await expect(
      page.getByRole("heading", { name: "Person Management" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Column headers present (assert by <th> tag — this PW version maps these
    // <th> to "cell" rather than "columnheader").
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Clearance" })).toBeVisible();
  });

  test("should create new person", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Toggle the inline create row
    await page.getByRole("button", { name: /add person/i }).click();

    // Fill inline fields (Inputs have no name attr -> target by placeholder)
    const timestamp = Date.now();
    await page.getByPlaceholder("First name").fill("Test");
    await page.getByPlaceholder("Last name").fill("User");
    await page
      .getByPlaceholder("Email")
      .fill(`test.user.${timestamp}@example.com`);
    // Department is intentionally left blank: the API only accepts a department
    // that matches an existing organization, and an empty one is sent as
    // undefined (skipping that check).
    await page.getByPlaceholder("Position").fill("Test Engineer");

    // Clearance is a Radix Select: open the combobox, pick an option
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Secret", exact: true }).click();

    // Submit the inline row (button labeled "Add", with a check icon)
    await page.getByRole("button", { name: /^add$/i }).click();

    // The new person should appear in the table
    await expect(page.getByText("Test User")).toBeVisible({ timeout: 10000 });
  });

  test("should edit existing person", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Skip if the list is empty (nothing to edit)
    const dataRows = page.getByRole("table").locator("tbody tr");
    const rowCount = await dataRows.count();
    if (rowCount === 0) {
      test.skip(true, "No persons in the list to edit");
    }

    const firstRow = dataRows.first();

    // Edit is an inline icon-only (Pencil) ghost button. It is the first
    // action button in the row; the second is the delete (trash) button.
    await firstRow.getByRole("button").first().click();

    // In edit mode the row's inputs are, in order:
    // 0 first_name, 1 last_name, 2 email, 3 department, 4 position.
    // (Clearance is a Radix Select, not an <input>.)
    const positionInput = firstRow.locator("input").nth(4);
    await positionInput.fill("Updated Position");

    // Save the inline edit (button labeled "Save")
    await firstRow.getByRole("button", { name: /save/i }).click();

    // Row returns to read mode -> Save button no longer present
    await expect(firstRow.getByRole("button", { name: /save/i })).toHaveCount(
      0,
      { timeout: 10000 },
    );
  });

  test("should show pagination when there are multiple pages", async ({
    page,
  }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Pagination text ("Page X of Y") only renders when total_pages > 1
    const paginationText = page.getByText(/page \d+ of \d+/i);

    if (await paginationText.isVisible().catch(() => false)) {
      const currentPageText = await paginationText.textContent();

      const nextButton = page.getByRole("button", { name: /next/i });
      if (!(await nextButton.isDisabled())) {
        await nextButton.click();
        await expect(paginationText).not.toHaveText(currentPageText || "");
      }
    }
  });

  test("filters persons with the search box", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });

    // Seed data includes John Doe and Jane Smith.
    await expect(page.getByText("John Doe")).toBeVisible();
    await expect(page.getByText("Jane Smith")).toBeVisible();

    // Server-side search narrows the list to matching names.
    await page.getByPlaceholder("Search persons").fill("Doe");

    await expect(page.getByText("John Doe")).toBeVisible();
    await expect(page.getByText("Jane Smith")).toHaveCount(0);
  });
});
