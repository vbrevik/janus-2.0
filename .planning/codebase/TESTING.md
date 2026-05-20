# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Frontend Unit Runner:**
- Vitest 4.x
- Config: `frontend/vite.config.ts` (test block inside Vite config, not a separate `vitest.config.ts`)
- Environment: `jsdom`
- Globals: enabled (`globals: true`) — no import of `describe`/`it`/`expect` needed in test files, but the single existing test file imports them explicitly via `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"`

**Frontend E2E Runner:**
- Playwright 1.56.x
- Config: `frontend/playwright.config.ts`
- Browsers: Chromium only (`Desktop Chrome`)
- Test directory: `frontend/e2e/`

**Backend Unit/Integration Runner:**
- Rust built-in test harness (`cargo test`)
- Async tests use `#[rocket::async_test]`
- Integration tests in `backend/tests/` (separate from source)
- Unit tests in `#[cfg(test)] mod tests` blocks within source files

**Assertion Library (Frontend):**
- Vitest built-in `expect` with `@testing-library/jest-dom` matchers (via `frontend/src/test-setup.ts`)

**Run Commands:**
```bash
# Frontend unit tests
cd frontend && npm run test          # Run all unit tests once
cd frontend && npm run test:watch    # Watch mode (npm run test with vitest without 'run')

# Frontend E2E tests
cd frontend && npx playwright test           # Run all E2E tests
cd frontend && npx playwright test --ui      # Interactive mode

# Backend tests
cd backend && cargo test                     # Run all tests (unit + integration)
cd backend && cargo test --test info_systems_test  # Run specific integration test file
```

## Test File Organization

**Frontend unit tests:**
- Co-located with the hook: `src/hooks/use-websocket.test.ts` alongside `src/hooks/use-websocket.ts`
- Naming: `<filename>.test.ts` or `<filename>.test.tsx`
- Only one unit test file currently exists

**Frontend E2E tests:**
- All in `frontend/e2e/` directory, separate from source
- Naming: `<feature>.spec.ts` — e.g., `auth.spec.ts`, `organizations.spec.ts`, `role-based-routing.spec.ts`
- One spec file per feature domain

**Backend unit tests:**
- Inline within source files using `#[cfg(test)] mod tests { ... }` at bottom of file
- Found in `backend/src/info_systems/models.rs` (validator tests) and `backend/src/person/handlers.rs` (pagination tests)

**Backend integration tests:**
- Separate files in `backend/tests/` directory
- One file per domain: `info_systems_test.rs`, `nda_test.rs`
- Naming: `<domain>_test.rs`

## Test Structure

**Frontend unit test suite (Vitest):**
```typescript
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWebSocket } from "./use-websocket";

beforeEach(() => {
  vi.useFakeTimers();
  // setup mocks
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useWebSocket — auth error stops reconnect", () => {
  it("does not reconnect after Invalid token error", () => {
    // arrange → act → assert
  });
});
```

**Frontend E2E test suite (Playwright):**
```typescript
import { test, expect } from '@playwright/test'

// Module-level login helper function
async function login(page: any) {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/personnel', { timeout: 10000 })
}

test.describe('Feature Area', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/target-route')
  })

  test('should do something', async ({ page }) => {
    // Playwright assertions
  })
})
```

**Backend integration test (Rocket):**
```rust
async fn create_test_client() -> Client {
    Client::tracked(create_rocket().await)
        .await
        .expect("valid rocket instance")
}

async fn get_auth_token(client: &Client) -> String {
    // POST to /api/auth/login, assert 200, extract token
}

#[rocket::async_test]
async fn test_list_info_systems() {
    let client = create_test_client().await;
    let token = get_auth_token(&client).await;
    // dispatch request, assert status, assert body fields
}
```

**Backend unit test:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_environment_valid() {
        assert!(validate_environment("DEV").is_ok());
    }
}
```

## Mocking

**Frontend framework:** Vitest (`vi`)

**Global stubbing pattern:**
```typescript
// Stub a browser global
vi.stubGlobal("WebSocket", WsMock);

// Restore after test
afterEach(() => {
  vi.unstubAllGlobals();
});
```

**Constructor mock pattern (for classes that are `new`-ed):**
```typescript
// Arrow functions cannot be constructors — use regular function syntax
WsMock = vi.fn(function MockWS() {
  return mockWs;  // return the shared mock object
});
vi.stubGlobal("WebSocket", WsMock);
```

**Timer mocking:**
```typescript
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

// Advance timers in act() wrapper
act(() => { vi.advanceTimersByTime(5000); });
```

**What to mock:**
- Browser globals not available in jsdom (e.g., `WebSocket`)
- Timer-dependent logic requiring `vi.useFakeTimers()`

**What NOT to mock:**
- React Query data — hooks tested via `renderHook` with real query instances
- Backend integration tests use a real Rocket instance connected to a live test database — no mocking

**Backend mocking:**
- No mocking library used in backend tests
- Integration tests start the real application (`create_rocket()`) against the actual database
- Each test authenticates via `get_auth_token()` and calls real endpoints

## Fixtures and Factories

**Frontend E2E test data:**
- Hard-coded credentials in a `TEST_CREDENTIALS` constant:
  ```typescript
  const TEST_CREDENTIALS = {
    admin: { username: 'admin', password: 'password123' },
    enduser: { username: 'enduser', password: 'password123' },
    official: { username: 'official', password: 'password123' },
  }
  ```
- Unique values generated via `Date.now()` timestamp to avoid collisions:
  ```typescript
  const timestamp = Date.now()
  const systemName = `Test System ${timestamp}`
  ```

**Backend test data:**
- Test data lives in the actual development database (seeded records assumed to exist)
- Tests that need specific records create them first via API, then use the returned ID

**Fixture location:**
- No dedicated fixture files — test data is inline in each spec/test file
- No factory helpers or seed scripts discoverable in test files

## Coverage

**Requirements:** None enforced. No coverage thresholds configured in `vitest` config or CI.

**View coverage:**
```bash
cd frontend && npx vitest run --coverage
```

## Test Types

**Unit Tests (Frontend):**
- Scope: Individual hooks only (`use-websocket.test.ts`)
- Approach: `renderHook` from `@testing-library/react`, assert hook behavior under mocked globals
- Coverage: One hook file covered; all route components, other hooks, and utility functions have no unit tests

**Unit Tests (Backend):**
- Scope: Validation functions and pure computation (pagination offset/limit)
- Approach: Direct function calls with `assert!` macros
- Found in: `backend/src/info_systems/models.rs`, `backend/src/person/handlers.rs`

**Integration Tests (Backend):**
- Scope: Full HTTP request/response cycle for a domain
- Approach: Rocket test client (`rocket::local::asynchronous::Client`) against real database
- Pattern: Create → Read → Update → Delete in sequence within a test suite
- Found in: `backend/tests/info_systems_test.rs` (complete), `backend/tests/nda_test.rs` (stub only — all tests `#[ignore]`)

**E2E Tests (Frontend):**
- Framework: Playwright
- Scope: User workflows from browser perspective against running dev server + backend
- Tests authenticate via UI form or `localStorage` injection for faster setup
- Covers: auth flows, role-based routing guards, navigation, CRUD operations per domain
- Spec files: `auth.spec.ts`, `navigation.spec.ts`, `role-based-routing.spec.ts`, `info-systems.spec.ts`, `organizations.spec.ts`, `personnel.spec.ts`, `access.spec.ts`, `audit.spec.ts`, `nda.spec.ts`, `roles.spec.ts`, `navigation-flow.spec.ts`

## Common Patterns

**Async hook testing:**
```typescript
import { renderHook, act } from "@testing-library/react";

const { result } = renderHook(() => useWebSocket({ url, token }));

act(() => {
  mockWs.onopen?.(new Event("open"));
});
act(() => {
  mockWs.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
});

expect(WsMock).toHaveBeenCalledTimes(1);
```

**E2E: Waiting for network responses (preferred for mutation tests):**
```typescript
const [response] = await Promise.all([
  page.waitForResponse(
    resp => resp.url().includes('/info-systems') && resp.request().method() === 'POST',
    { timeout: 15000 }
  ),
  page.getByRole('button', { name: /^add$/i }).first().click()
])
expect(response.status()).toBe(200)
```

**E2E: Auth via localStorage injection (faster than form login):**
```typescript
async function loginAsRole(page, username, password) {
  const response = await page.request.post('http://localhost:15520/api/auth/login', {
    data: { username, password },
  })
  await page.goto('http://localhost:5173/')
  await page.evaluate(({ token, userId, role, username }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: userId, username, role }))
  }, { token: data.token, userId: data.user_id, role: data.role, username })
  await page.reload()
  await page.waitForLoadState('networkidle')
}
```

**Backend integration: Create-then-use pattern:**
```rust
// First create the resource
let create_response = client.post("/api/info-systems")
    .header(ContentType::JSON)
    .header(auth_header(&token))
    .body(json!({ ... }).to_string())
    .dispatch().await;
let created: Value = create_response.into_json().await.expect("valid json");
let system_id = created["id"].as_i64().unwrap();

// Then operate on it
let response = client.get(format!("/api/info-systems/{}", system_id))
    .header(auth_header(&token))
    .dispatch().await;
assert_eq!(response.status(), Status::Ok);
```

**Backend: Validation error testing:**
```rust
// Test invalid enum values return 400
let response = client.post("/api/info-systems")
    .body(json!({ "environment": "INVALID" }).to_string())
    .dispatch().await;
assert_eq!(response.status(), Status::BadRequest);
```

---

*Testing analysis: 2026-05-20*
