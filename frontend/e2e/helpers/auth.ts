// Auth helpers - shared login flows for e2e specs
// App reality: admin redirects to /admin/dashboard; localStorage shape is
// { token: <jwt>, user: { id: person_id, username, role } } (see auth-context.tsx)
import { type Page, expect } from "@playwright/test";

const API_BASE = "http://localhost:15520";

const DEFAULT_ROUTE: Record<string, string> = {
  admin: "/admin/dashboard",
  enduser: "/enduser/tasks",
  official: "/official/dashboard",
};

/** Log in through the real login form and wait for the role's default route. */
export async function loginViaUI(
  page: Page,
  username = "admin",
  password = "password123",
) {
  await page.goto("/login");
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  const target = DEFAULT_ROUTE[username] ?? DEFAULT_ROUTE.admin;
  await page.waitForURL(`**${target}`, { timeout: 10000 });
}

/** Log in via the API and inject auth state into localStorage (fast path). */
export async function loginViaApi(
  page: Page,
  username = "admin",
  password = "password123",
) {
  const response = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
  const data = await response.json();

  await page.goto("/");
  await page.evaluate(
    ({ token, id, username, role }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ id, username, role }));
    },
    { token: data.token, id: data.person_id, username, role: data.role },
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  return data;
}

export { API_BASE };
