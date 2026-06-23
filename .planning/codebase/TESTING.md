# Testing Patterns

**Analysis Date:** 2026-06-23

## Test Framework

**Frontend unit/integration:**
- Vitest 4 — config in `frontend/vite.config.ts` (`test` block).
- Environment: `jsdom`, `globals: true`, setup file `./src/test-setup.ts`.
- e2e excluded from the Vitest run via `exclude: ["e2e/**", "node_modules/**"]`.

**Frontend e2e:**
- Playwright 1.56 — config in `frontend/playwright.config.ts`. Single `chromium` project, `baseURL: http://localhost:15510`, auto-starts `npm run dev` as `webServer`.

**Assertion / DOM matchers:**
- Vitest `expect` + `@testing-library/jest-dom` (loaded in `src/test-setup.ts`).
- React component testing via `@testing-library/react` (`renderHook`, `act`).

**Backend:**
- Rust built-in `#[test]` / `#[cfg(test)] mod tests` (8 modules across `backend/src`, e.g. `auth/jwt.rs`, `person/handlers.rs`, `shared/pagination.rs`). No external Rust test framework.

**Run Commands:**
```bash
cd frontend && npm run test          # Vitest unit (vitest run, jsdom)
cd frontend && npm run test:watch    # Vitest watch
cd frontend && npx playwright test   # e2e (needs backend + DB up)
cd backend && cargo test             # Rust unit tests
```

## Test File Organization

**Location:**
- Frontend unit tests co-located with source: `frontend/src/demo/lib/abac.test.ts`, `frontend/src/hooks/use-websocket.test.ts`.
- e2e specs in a dedicated dir: `frontend/e2e/*.spec.ts` (11 specs: auth, navigation, access, audit, roles, nda, organizations, personnel, info-systems, role-based-routing, navigation-flow).
- Backend tests inline in the module they cover, under `#[cfg(test)] mod tests`.

**Naming:**
- Unit: `*.test.ts(x)`. e2e: `*.spec.ts`. Rust: `mod tests` with `fn test_*`.

**Concentration of coverage:**
- 8 Vitest unit files (mostly pure ABAC/policy/obligations/auditlog logic under `src/demo/lib/`), plus 6 in `src/spikes/lib/` (spike scratch — not production paths).
- Coverage is heaviest on pure decision logic and the WebSocket hook; route components and most hooks are exercised mainly through Playwright e2e.

## Test Structure

**Suite Organization (Vitest):**
```typescript
import { describe, it, expect } from "vitest";

describe("pure-computed ABAC: per-domain tiers + deny overrides", () => {
  it("ALLOWs when clearance, domain tier, need-to-know, and affiliation all pass", () => {
    const d = decide("subj-1", "res-1");
    expect(d.decision).toBe("ALLOW");
    expect(d.rules.every((r) => r.pass)).toBe(true);
  });
});
```
- Descriptive `describe`/`it` strings stating expected behavior (often citing scenario IDs like `A7`, `A4`).
- Local helper builders at top of file for terse fixtures (`subj()`, `res()`, `decide()` in `abac.test.ts`).

**Backend (Rust):**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_creation_and_validation() {
        let token = create_jwt(user_id, role, secret).expect("Failed to create JWT");
        let claims = validate_jwt(&token, secret).expect("Failed to validate JWT");
        assert_eq!(claims.sub, user_id);
    }
}
```
- `use super::*;` to reach the module under test; `assert_eq!` / `assert!`; `.expect("...")` / `.unwrap()` for setup.

## Mocking

**Framework:** Vitest `vi` (`vi.fn`, `vi.stubGlobal`, `vi.useFakeTimers`, `vi.unstubAllGlobals`).

**Pattern (global mock + fake timers) — `use-websocket.test.ts`:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  mockWs = { send: vi.fn(), close: vi.fn(), readyState: 1, onopen: null, /* ... */ };
  // regular function, not arrow — `new WebSocket()` must be constructable
  WsMock = vi.fn(function MockWS() { return mockWs; });
  vi.stubGlobal("WebSocket", WsMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
```
- Drive lifecycle by invoking the mock's handlers inside `act()` (`mockWs.onopen?.(new Event("open"))`).

**What to Mock:**
- Browser globals not in jsdom (`WebSocket`), timers for reconnect/debounce logic.

**What NOT to Mock:**
- Pure logic (ABAC/policy/obligations) is tested directly against real seed data (`SUBJECTS`, `RESOURCES` from `./seed`) — no mocks.

## Fixtures and Factories

**Test Data:**
- Pure-logic tests pull from in-repo seed arrays and use tiny lookup helpers:
```typescript
const subj = (id: string): Subject => SUBJECTS.find((s) => s.id === id)!;
const res  = (id: string): Resource => RESOURCES.find((r) => r.id === id)!;
```
- e2e relies on seeded users (all password `password123`): `admin`, `manager`, `operator`, `viewer`.

**Location:** Co-located `seed.ts` in `src/demo/lib/`; no shared factory library.

## Coverage

**Requirements:** None enforced. No coverage provider configured in `vite.config.ts` or `package.json`, no CI threshold.

**View Coverage:** Not wired up. Would require `vitest run --coverage` plus a coverage provider dependency.

## Test Types

**Unit:** Vitest against pure functions (ABAC evaluation, policy, obligations, auditlog) and the WebSocket hook.

**Integration:** Light — hook-level via `@testing-library/react renderHook`.

**E2E:** Playwright covers auth and role-based routing plus each admin domain page. Requires backend (:15520) + Postgres (:15530) up; auto-starts the frontend dev server. Note: the WebSocket server (:15540) rejects auth and floods the console — ignore it in tests, don't chase it.

## Common Patterns

**Async / timer testing:**
```typescript
vi.useFakeTimers();
act(() => { mockWs.onclose?.(); });  // advance/trigger inside act()
```

**Error / decision testing:**
```typescript
expect(d.decision).toBe("DENY");
expect(d.failed).toContain("Affiliation");
// Rust:
assert!(validate_jwt(&token, wrong_secret).is_err());
```

---

*Testing analysis: 2026-06-23*
