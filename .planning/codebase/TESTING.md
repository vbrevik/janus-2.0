# Testing Patterns

**Analysis Date:** 2026-06-18

## Test Framework

**Unit/Integration Runner:**
- Vitest (configured in `frontend/vite.config.ts` under `test:`)
- Environment: `jsdom`
- Globals: enabled (`describe`, `it`, `expect`, `vi` available without import — but explicit imports are used in practice)
- Setup file: `frontend/src/test-setup.ts` (imports `@testing-library/jest-dom`)

**E2E Runner:**
- Playwright, config at `frontend/playwright.config.ts`
- Browser: Chromium only
- Base URL: `http://localhost:15510`
- Web server: auto-started via `npm run dev`; reuses existing server in non-CI

**Assertion Library:**
- Vitest built-in (`expect`) + `@testing-library/jest-dom` matchers for DOM assertions

**Run Commands:**
```bash
cd frontend && npm run test              # Vitest unit (jsdom), excludes e2e/
cd frontend && npx playwright test       # e2e (auto-starts frontend; backend + DB must be up)
# No watch or coverage commands observed in package.json scripts
```

## Test File Organization

**Unit tests — co-located with source:**
- `frontend/src/hooks/use-websocket.test.ts` — alongside hook implementation
- `frontend/src/demo/lib/*.test.ts` — alongside demo library modules
- `frontend/src/demo/store/world-state.test.tsx` — alongside store
- `frontend/src/spikes/lib/*.test.ts` — alongside spike modules

**E2E tests — separate directory:**
- `frontend/e2e/*.spec.ts` — one file per domain/feature
- `frontend/e2e/helpers/` — shared helpers (`auth.ts` provides `loginViaUI`)

**Excluded from Vitest:**
- `e2e/**` and `node_modules/**` explicitly excluded in `vite.config.ts`

## Test Structure

**Suite Organization (Vitest):**
```typescript
import { describe, it, expect } from "vitest";

describe("feature/module name — short description of invariant", () => {
  it("descriptive test name using kebab-case or plain English", () => {
    // arrange
    // act
    // assert
  });
});
```

**Nested describe blocks** are used for sub-feature grouping:
```typescript
describe("world-state reducer", () => {
  // ...
  describe("TOGGLE_RESOURCE_GRANT action", () => {
    it("toggles disabledResourceGrantIds on then off", () => { /* ... */ });
  });
});
```

**E2E Organization (Playwright):**
```typescript
import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/auth";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto("/admin/route");
  });

  test("action description", async ({ page }) => {
    await page.fill('[name="field"]', "value");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/expected-url");
  });
});
```

## Mocking

**Framework:** Vitest `vi`

**Global stubbing pattern (WebSocket mock):**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    onopen: null, onmessage: null, onerror: null, onclose: null,
  };
  // Arrow fns can't be constructors — use regular function
  const WsMock = vi.fn(function MockWS() { return mockWs; });
  vi.stubGlobal("WebSocket", WsMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
```

**Fake timers:** Used when testing reconnect/timeout logic. Always paired with `vi.useRealTimers()` in `afterEach`.

**What to mock:**
- Global browser APIs not available in jsdom (e.g., `WebSocket`)
- Time-dependent code (use `vi.useFakeTimers()` + `vi.advanceTimersByTime(ms)`)

**What NOT to mock:**
- Pure functions (ABAC evaluators, reducers, policy engines) — test with real inputs
- Seed data structures — use inline fixtures or real seed imports (see D3-13 below)

## Fixtures and Factories

**Pattern: Inline fixtures preferred (D3-13 pattern)**

Tests for pure logic modules define fixtures inline rather than importing from seed files. This makes tests self-contained and immune to seed changes:
```typescript
// Good — inline fixture
const BASELINE_POLICY: ResourcePolicy = {
  id: "pol-baseline",
  label: "Baseline",
  gates: [{ kind: "CLEARANCE" }, { kind: "OWN_TIER_GRANT" }, { kind: "PARENT_TIER_GRANT" }],
  zone_prereq_id: null,
};

// Acceptable — seed import ONLY for seed-integration tests
import { RESOURCE_NODES, RESOURCE_GRANTS } from "./seed";
```

**Seed data** lives in `**/lib/seed.ts` or `**/store/seed.ts` files co-located with the modules they seed. Not a global fixtures directory.

**Helper functions** within test files for common arrange/act steps:
```typescript
const subj = (id: string): Subject => SUBJECTS.find((s) => s.id === id)!;
const decide = (sId: string, rId: string) =>
  evaluate(principalFromSubject(subj(sId)), requirementFromResource(res(rId)));
```

**E2E helpers:**
- `frontend/e2e/helpers/auth.ts` exports `loginViaUI(page)` — shared across all e2e specs

**Fixed clock for time-sensitive tests:**
```typescript
const NOW = new Date("2026-02-15T12:00:00Z");
const NOW_A = new Date("2026-02-15T00:00:00Z"); // inside window A
const NOW_B = new Date("2026-04-15T00:00:00Z"); // inside window B
```
Always use explicit `Date` constants, never `new Date()` (which would use real system time).

## Coverage

**Requirements:** Not enforced — no coverage threshold configured.

**View Coverage:**
```bash
cd frontend && npx vitest run --coverage
```
(No `--coverage` script in package.json; add `@vitest/coverage-v8` for this.)

## Test Types

**Unit Tests (Vitest, jsdom):**
- Scope: pure functions, reducers, ABAC evaluators, policy engines, hooks
- Location: co-located with source (`*.test.ts`, `*.test.tsx`)
- No backend required; no network calls

**Integration Tests (Vitest):**
- Seed-integration tests in `frontend/src/demo/lib/digital-resource.test.ts` — import real seed fixtures and run engine against them
- Still use Vitest/jsdom; no real network

**E2E Tests (Playwright):**
- Scope: full browser flows — auth, navigation, CRUD, role-based routing
- Requires: backend on `:15520`, DB on `:15530`, frontend auto-started by Playwright
- Location: `frontend/e2e/*.spec.ts`
- All tests log in via `loginViaUI` helper (UI-based, not API shortcut)

## Named Pitfall Tests

For phase acceptance criteria, test names are **exactly specified** in the phase plan and must match precisely (the verifier greps for them by name). See `frontend/src/demo/lib/digital-resource.test.ts` for the pattern:
```typescript
it("cross-tier-inheritance-blocked", () => { /* ... */ });
it("advisory-non-blocking", () => { /* ... */ });
it("unknown-gate-kind-errors", () => { /* ... */ });
```
These named tests serve as executable acceptance criteria gates.

## Common Patterns

**Async Testing (Playwright):**
```typescript
// Use await for all page actions; assert with expect().toHaveURL / toBeVisible
await page.fill('[name="username"]', "admin");
await page.click('button[type="submit"]');
await expect(page).toHaveURL("/admin/dashboard");
```

**Async Testing (Vitest with fake timers):**
```typescript
act(() => {
  mockWs.onopen?.(new Event("open"));
});
act(() => {
  vi.advanceTimersByTime(5000);
});
expect(WsMock).toHaveBeenCalledTimes(1);
```

**Immutability assertions (reducer tests):**
```typescript
expect(after).not.toBe(before);           // new object reference
expect(after.flags).not.toBe(before.flags); // nested new reference
expect(before.compartments).not.toContain("BLACKWING"); // original untouched
```

**Error path testing:**
```typescript
expect(result.allow).toBe(false);
expect(result.reason).toBe("NO_ACTIVE_POLICY");
expect(result.gates).toHaveLength(0);
```

**Playwright error rendering:**
- Error messages render in `div.bg-destructive/10` — no `role="alert"`. Target via class selector:
  ```typescript
  await page.waitForSelector(".bg-destructive\\/10", { timeout: 5000 });
  ```

---

*Testing analysis: 2026-06-18*
