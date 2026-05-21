# Phase 1: Canonical Guard - Research

**Researched:** 2026-05-20
**Domain:** React component refactor — frontend route guard consolidation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All legacy auth-only routes migrate to `allowedRoles={['admin','enduser','official']}`. The legacy guard performed no role check (any authenticated user), so granting all three roles preserves current behavior exactly — zero regression. Access-tightening is explicitly deferred to the v2 backend-RBAC milestone (SEC-*), and Phase 2 (ROUTE-05) removes most of these duplicate routes anyway.
- **D-02:** This preserve-behavior rule is uniform across all 15 live legacy importers, including `routes/admin/info-systems.tsx` — it is admin-pathed but currently auth-only, so under the preserve rule it also receives all three roles. Revisit during Phase 2 consolidation.
- **D-03:** Fix `routes/admin/profile.tsx`: change `allowedRoles={['enduser']}` → `allowedRoles={['admin']}`. It lives in the `admin/` tree and separate `enduser/` and `official/` profile pages exist, so `['enduser']` is a `sed`-script artifact, not intent. Correcting a guard declaration is in Phase 1 scope.
- **D-04:** Delete `routes/person/$personnelId.tsx.bak` and `routes/admin/person/$personnelId.tsx.bak`. They import the legacy guard and are dead variants (TanStack router ignores `.bak`), so they block the "zero remaining imports" requirement. `update_admin_routes.sh` only references the guard name inside `sed` strings (not a real import) — leave it for Phase 4 / CLEAN-01.
- **D-05:** Verify via manual per-role click-through (log in as admin / enduser / official, confirm an admin route still redirects a non-admin). Matches Success Criterion 5's exact wording ("manually visiting"). No unit test added — formal testing is Phase 3.

### Claude's Discretion

- Migration mechanics (edit order, whether to script vs hand-edit each file), import-path formatting, and whether to run a final `grep` sweep to prove zero residual imports.
- Whether `routeTree.gen.ts` needs regeneration (no route dirs are added/removed in Phase 1; deleting `.bak` files does not change the generated tree).

### Deferred Ideas (OUT OF SCOPE)

- Tightening route access (restrictive per-audience `allowedRoles`) — v2 backend-RBAC milestone (SEC-*).
- Removing/unifying duplicate top-level vs admin/official/enduser route pairs — Phase 2 (ROUTE-05).
- Deleting `routes/admin/update_admin_routes.sh` — Phase 4 (CLEAN-01).
- Re-evaluating `routes/admin/info-systems.tsx` role scope once duplicates are consolidated — Phase 2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUARD-01 | A single canonical `ProtectedRoute` component (PascalCase, `allowedRoles`-aware) is the only guard in the codebase | Canonical guard exists at `frontend/src/components/ProtectedRoute.tsx`; legacy exists at `frontend/src/components/protected-route.tsx` — confirmed by direct file read |
| GUARD-02 | All route files (~15) are migrated off the old `protected-route.tsx` and declare correct `allowedRoles` | Exact list of 15 live files enumerated in this document; all use identical pattern making migration mechanical |
| GUARD-03 | The old `protected-route.tsx` is deleted with no remaining imports, and role-based access is not regressed | 2 `.bak` dead files block completion; both confirmed to import the legacy guard; deletion plan documented |
</phase_requirements>

---

## Summary

Phase 1 is a pure frontend refactor with no new features. The codebase has two `ProtectedRoute` implementations:

- `frontend/src/components/ProtectedRoute.tsx` (PascalCase) — canonical, role-aware via `allowedRoles: string[]`. Currently used correctly by 18 route files.
- `frontend/src/components/protected-route.tsx` (kebab-case) — legacy, auth-only (no role check). Still imported by 15 live route files and 2 dead `.bak` files.

The migration is mechanical: for each of the 15 live legacy importers, swap the import path from `@/components/protected-route` to `@/components/ProtectedRoute`, add `allowedRoles={['admin','enduser','official']}` to the JSX element, and delete the `<ProtectedRoute>` attributes that relied on the old zero-prop API. One existing canonical-guard file (`admin/profile.tsx`) additionally needs its wrong `allowedRoles={['enduser']}` corrected to `['admin']`. After live migration: delete the 2 `.bak` files, then delete `protected-route.tsx` itself.

The build currently passes (`npm run build` green) and routeTree.gen.ts is not affected by this phase — no route directories are added or removed.

**Primary recommendation:** Migrate the 15 live files in one focused wave, fix the `admin/profile` anomaly, delete the 2 `.bak` files and the legacy component, then confirm with `grep` + build check + manual role click-through.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authentication check (is user logged in?) | Browser / Client | — | `ProtectedRoute` reads `AuthContext` which reads `localStorage`; entirely client-side |
| Role enforcement (is user's role allowed?) | Browser / Client | — | `allowedRoles.includes(user.role)` evaluated in `ProtectedRoute` JSX; no backend involvement in Phase 1 |
| Unauthenticated redirect | Browser / Client | — | `<Navigate to="/login" search={{ redirect: location.pathname }}>` — declarative TanStack Router navigation |
| Wrong-role redirect | Browser / Client | — | `<Navigate to={getDefaultRoute(user.role)}>` — canonical guard uses `getDefaultRoute()` from auth-context |
| Route tree registration | Frontend Server (SSR) | — | TanStack Router Vite plugin reads `src/routes/` filesystem and generates `routeTree.gen.ts` at build time |

---

## Standard Stack

This phase uses only the stack already present in the project. No new packages are required.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-router` | 1.133.x | File-based routing, `<Navigate>`, `useLocation` | Project's established router [VERIFIED: CLAUDE.md] |
| React | 19.1.1 | Component rendering | Project foundation [VERIFIED: CLAUDE.md] |

### No New Packages Required

This phase is a component-level refactor: edit imports and JSX props. No new dependencies are introduced.

## Package Legitimacy Audit

> Not applicable — Phase 1 installs zero external packages.

---

## Architecture Patterns

### How the Canonical Guard Works

```tsx
// Source: frontend/src/components/ProtectedRoute.tsx (read directly)
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) { return <LoadingSpinner /> }

  if (!isAuthenticated) {
    // Preserves redirect param so login can return user to intended page
    return <Navigate to="/login" search={{ redirect: location.pathname } as any} />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    const defaultRoute = redirectTo || (user ? getDefaultRoute(user.role) : '/login')
    return <Navigate to={defaultRoute} />
  }

  return <>{children}</>
}
```

**Key behaviors vs. legacy guard:**

| Behavior | Legacy (`protected-route.tsx`) | Canonical (`ProtectedRoute.tsx`) |
|----------|-------------------------------|----------------------------------|
| Unauthenticated redirect | `useEffect` + `navigate({ to: '/login' })` — no redirect param | Declarative `<Navigate to="/login" search={{ redirect: pathname }}>` — preserves return URL |
| Auth check timing | Returns `null` while loading | Shows spinner while loading |
| Role check | None | `allowedRoles.includes(user.role)` |
| Wrong-role redirect | N/A | `getDefaultRoute(user.role)` or `redirectTo` prop |

### Guard Placement in TanStack File-Based Routing

The guard wraps page content **inside the route component function**, not at the route definition level. TanStack Router does not provide a built-in `beforeLoad` auth integration here — the project uses the component-wrapping pattern throughout.

Pattern used by all canonical routes (confirmed by reading multiple files):

```tsx
// Route file: defines Route constant — thin shell
export const Route = createFileRoute('/admin/dashboard')({
  component: () => (
    <Suspense fallback={<Spinner />}>
      <DashboardPage />   // lazy-loaded _component.tsx
    </Suspense>
  ),
})

// _component.tsx: contains the actual guard usage
export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        {/* page content */}
      </Layout>
    </ProtectedRoute>
  )
}
```

For legacy-guard files (single-file routes, no `_component.tsx` split), the guard wraps content inside the function body directly:

```tsx
function Dashboard() {
  return (
    <ProtectedRoute>   {/* ← legacy: zero props */}
      <Layout>...</Layout>
    </ProtectedRoute>
  )
}
```

After migration it becomes:

```tsx
function Dashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'enduser', 'official']}>
      <Layout>...</Layout>
    </ProtectedRoute>
  )
}
```

### routeTree.gen.ts and Regeneration

Phase 1 makes **zero changes to route directory structure**. No directories are added or removed. Deleting `.bak` files does not affect TanStack Router's route scanning (the plugin only picks up `.tsx` files). Therefore `routeTree.gen.ts` does NOT need regeneration after this phase.

The file is currently committed and correct. It imports from `admin/dashboard/` and `admin/discussions/` which are untracked in git — these are existing Phase 2 concerns, not Phase 1.

### Recommended Project Structure (no changes needed)

```
frontend/src/components/
├── ProtectedRoute.tsx     ← KEEP: canonical guard, single authority
├── protected-route.tsx    ← DELETE in Phase 1
└── ...
```

### Anti-Patterns to Avoid

- **Editing `routeTree.gen.ts` by hand:** It is generated — the TanStack plugin overwrites it on next build. Never edit it.
- **Using relative imports for the guard:** All project imports use `@/` path aliases. The import must be `from '@/components/ProtectedRoute'`, not a relative path.
- **Forgetting the `.bak` files:** `grep` on `.tsx` only would miss the two `.bak` files. The final zero-import check must include all file extensions.

---

## Complete Migration Inventory

### Files to Migrate (15 live legacy importers)

These files import `from '@/components/protected-route'` and currently use `<ProtectedRoute>` with zero props (no role check). [VERIFIED: direct grep of filesystem]

| File | Route Path | Correct `allowedRoles` (per D-01/D-02) |
|------|-----------|----------------------------------------|
| `routes/dashboard.tsx` | `/dashboard` | `['admin', 'enduser', 'official']` |
| `routes/profile.tsx` | `/profile` | `['admin', 'enduser', 'official']` |
| `routes/tasks.tsx` | `/tasks` | `['admin', 'enduser', 'official']` |
| `routes/info-systems.tsx` | `/info-systems` | `['admin', 'enduser', 'official']` |
| `routes/person/index.tsx` | `/person/` | `['admin', 'enduser', 'official']` |
| `routes/person/$personId.tsx` | `/person/$personId` | `['admin', 'enduser', 'official']` |
| `routes/person-relations/index.tsx` | `/person-relations/` | `['admin', 'enduser', 'official']` |
| `routes/organizations/index.tsx` | `/organizations/` | `['admin', 'enduser', 'official']` |
| `routes/organizations/$organizationId.tsx` | `/organizations/$organizationId` | `['admin', 'enduser', 'official']` |
| `routes/roles/index.tsx` | `/roles/` | `['admin', 'enduser', 'official']` |
| `routes/ndas/index.tsx` | `/ndas/` | `['admin', 'enduser', 'official']` |
| `routes/audit/index.tsx` | `/audit/` | `['admin', 'enduser', 'official']` |
| `routes/access/index.tsx` | `/access/` | `['admin', 'enduser', 'official']` |
| `routes/access/view.tsx` | `/access/view` | `['admin', 'enduser', 'official']` |
| `routes/admin/info-systems.tsx` | `/admin/info-systems` | `['admin', 'enduser', 'official']` (D-02: preserve-behavior; tighten in Phase 2) |

### File to Fix (allowedRoles anomaly — D-03)

| File | Current (wrong) | Correct |
|------|----------------|---------|
| `routes/admin/profile.tsx` | `allowedRoles={['enduser']}` | `allowedRoles={['admin']}` |

**Note:** `routes/official/profile.tsx` also has `allowedRoles={['enduser']}` — this is the same artifact. D-03 in CONTEXT.md explicitly names `admin/profile.tsx` only. The `official/profile.tsx` case needs a decision: it follows the same pattern (a profile page in the `official/` tree showing `['enduser']`). Research finding: this appears to be the same `sed`-script artifact. The planner should include `official/profile.tsx` → `allowedRoles={['official']}` in the same fix or explicitly note it as out of scope. [VERIFIED: direct file read]

### Files to Delete (dead files — D-04)

| File | Reason |
|------|--------|
| `routes/person/$personnelId.tsx.bak` | Dead variant (TanStack Router ignores `.bak`); imports legacy guard; stale route path `/personnel/$personnelId` |
| `routes/admin/person/$personnelId.tsx.bak` | Same — dead variant; imports legacy guard; stale |

### File to Delete (GUARD-03 completion)

| File | When |
|------|------|
| `frontend/src/components/protected-route.tsx` | After all 15 live importers and 2 `.bak` files are handled |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state | Custom session logic | `useAuth()` from `@/contexts/auth-context` | Already implemented; provides `user`, `isAuthenticated`, `isLoading` |
| Role default routes | Custom switch statement | `getDefaultRoute(role)` from `@/contexts/auth-context` | Canonical; canonical guard already uses it |
| Navigation on redirect | `useNavigate` + `useEffect` | `<Navigate to="..." />` | Declarative; avoids stale-closure bugs; this is exactly what the canonical guard already does |

**Key insight:** The canonical guard is already complete and correct. The only work is updating importers — zero new logic is needed.

---

## Common Pitfalls

### Pitfall 1: macOS Case-Insensitive Filesystem
**What goes wrong:** On macOS, `import from '@/components/ProtectedRoute'` and `import from '@/components/protected-route'` resolve to the same file if only one exists. After deletion of `protected-route.tsx`, any file still importing the old path would import `ProtectedRoute.tsx` silently — getting the correct file, but with the wrong API (it exports a function that requires `allowedRoles`, not zero-prop).
**Why it happens:** macOS HFS+/APFS filesystems are case-insensitive by default. TypeScript and Vite on macOS may not catch the case mismatch during dev, but Linux CI/Docker builds will fail.
**How to avoid:** Migrate all 15 files to `from '@/components/ProtectedRoute'` (exact case) before deleting `protected-route.tsx`. Run the final `grep -r "components/protected-route"` check (lowercase) to confirm zero hits.
**Warning signs:** Build passes on dev Mac, but fails in Docker (`linux/amd64`). ESLint may not catch it without case-sensitive import rules.

### Pitfall 2: Forgetting `.bak` Files in the Zero-Import Check
**What goes wrong:** Running `grep -r "components/protected-route" frontend/src --include="*.tsx"` returns zero — but the `.bak` files still import the legacy guard. GUARD-03 requires zero imports in any file, regardless of extension.
**Why it happens:** Standard glob patterns like `--include="*.tsx"` skip non-standard extensions.
**How to avoid:** The final verification grep must NOT use `--include`: `grep -r "components/protected-route" frontend/src`. Alternatively, delete the `.bak` files first so they can never be found.
**Warning signs:** `grep` with extension filter returns zero, but full grep still finds hits.

### Pitfall 3: Missing `allowedRoles` Prop After Import Swap
**What goes wrong:** Developer swaps `from '@/components/protected-route'` to `from '@/components/ProtectedRoute'` but forgets to add `allowedRoles={...}` to the JSX. TypeScript will catch this — `allowedRoles` is required in `ProtectedRouteProps`.
**Why it happens:** Two-step edit (import line + JSX attribute) done as separate actions, second step missed.
**How to avoid:** Treat each file migration as an atomic two-part change. Run `npm run build` (TypeScript check) after batch migration — missing `allowedRoles` will produce a compile error, not just a runtime bug.
**Warning signs:** TypeScript error: `Property 'allowedRoles' is missing in type '{ children: ... }'`.

### Pitfall 4: Editing `routeTree.gen.ts`
**What goes wrong:** Developer sees the generated file import the legacy guard (it does not — only route component files do) or tries to "fix" the import path there.
**Why it happens:** Confusion between the route tree and route component files.
**How to avoid:** `routeTree.gen.ts` imports from route files only — it contains no guard imports. Never edit it manually. Phase 1 makes no structural route changes, so no regeneration is needed.

---

## Code Examples

### Migration Pattern (before → after)

```tsx
// BEFORE: legacy guard (zero props, auth-only)
import { ProtectedRoute } from '@/components/protected-route'

function Dashboard() {
  return (
    <ProtectedRoute>
      <Layout>...</Layout>
    </ProtectedRoute>
  )
}

// AFTER: canonical guard (with allowedRoles)
import { ProtectedRoute } from '@/components/ProtectedRoute'

function Dashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'enduser', 'official']}>
      <Layout>...</Layout>
    </ProtectedRoute>
  )
}
```

Two changes per file: (1) import path case/separator, (2) add `allowedRoles` prop.

### admin/profile.tsx Fix Pattern (D-03)

```tsx
// BEFORE (wrong — sed artifact)
<ProtectedRoute allowedRoles={['enduser']}>

// AFTER (correct — admin tree)
<ProtectedRoute allowedRoles={['admin']}>
```

### Post-Migration Verification Commands

```bash
# 1. Zero legacy imports (all file types, no extension filter)
grep -r "components/protected-route" frontend/src
# Expected: no output

# 2. Legacy file deleted
ls frontend/src/components/protected-route.tsx
# Expected: No such file or directory

# 3. Build passes
cd frontend && npm run build
# Expected: exit 0

# 4. Vitest still green
cd frontend && npm run test -- --run
# Expected: 3 passed (existing use-websocket tests)
```

---

## Guard API Reference

**Canonical guard signature** (from `frontend/src/components/ProtectedRoute.tsx`): [VERIFIED: direct file read]

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]      // required — no default
  redirectTo?: string         // optional — overrides getDefaultRoute() on wrong-role
}
```

**Role values** (from `frontend/src/contexts/auth-context.tsx`): [VERIFIED: direct file read]

```typescript
// getDefaultRoute() recognizes exactly these three values:
'admin'    // → /admin/dashboard
'enduser'  // → /enduser/tasks
'official' // → /official/dashboard
```

**Redirect behavior:**
- Unauthenticated → `/login?redirect=<current-pathname>` (return URL preserved)
- Wrong role → `getDefaultRoute(user.role)` (user sent to their own home) or `redirectTo` prop

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `useEffect` + `useNavigate` for auth redirect (legacy guard) | Declarative `<Navigate>` (canonical guard) | Eliminates stale closure bugs; renders synchronously on first paint |
| No-prop `<ProtectedRoute>` (auth only) | `allowedRoles`-aware `<ProtectedRoute>` | Role enforcement in UI; prevents wrong-role users from seeing page content |

**Deprecated:**
- `protected-route.tsx`: auth-only, no role check, uses `useEffect`+`useNavigate` stale pattern. Replaced by `ProtectedRoute.tsx` entirely.

---

## Environment Availability

> Step 2.6: No external services required — Phase 1 is source-code edits only.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | `npm run build`, `npm run test` | ✓ | Node 20 (per Dockerfile) | — |
| Vite | Build verification | ✓ | 7.1.7 (confirmed by build run) | — |
| Vitest | Test run | ✓ | 4.0.3 (confirmed by test run) | — |

**Build currently passes:** `npm run build` completed green (1952 modules, exit 0). [VERIFIED: direct run]
**Tests currently pass:** `vitest run` — 3 tests green. [VERIFIED: direct run]

---

## Open Questions

1. **`official/profile.tsx` allowedRoles anomaly**
   - What we know: `routes/official/profile.tsx` has `allowedRoles={['enduser']}` — same `sed`-script artifact pattern as `admin/profile.tsx` (D-03).
   - What's unclear: D-03 in CONTEXT.md mentions only `admin/profile.tsx` explicitly. The official profile page with `['enduser']` means official-role users cannot access their own profile page at `/official/profile`.
   - Recommendation: Planner should fix `official/profile.tsx` → `allowedRoles={['official']}` in the same task as D-03, OR explicitly defer it to Phase 2. This is a functional bug — an official-role user is currently blocked from their own profile page.

2. **Whether to batch-edit or file-by-file**
   - What we know: All 15 files use an identical pattern — import swap + `allowedRoles` add.
   - What's unclear: Claude's Discretion per CONTEXT.md.
   - Recommendation: A single task per file is clearest for commit granularity and verification. A single wave of 15 files is also acceptable since the change is purely mechanical.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `routes/official/profile.tsx` has `allowedRoles={['enduser']}` as a sed-script artifact (same as admin/profile) | Open Questions | If intentional, fixing it would break official users' access to profile — but the page IS in the official/ tree, so this seems clearly wrong |

**All other claims in this document were verified by direct file reads or command execution on the actual codebase.**

---

## Project Constraints (from CLAUDE.md)

Directives from `CLAUDE.md` relevant to this phase:

- **Routing:** TanStack file-based router; `routeTree.gen.ts` is generated — must be regenerated (not hand-edited) after route changes. Phase 1 adds/removes no route files → no regeneration needed.
- **Security:** Do not regress the role-aware UI guards while consolidating; the PascalCase `ProtectedRoute` with `allowedRoles` is the canonical one. This is the entire purpose of Phase 1.
- **Import style:** Use `@/` prefix for all internal imports; never use relative paths.
- **Named exports:** All components use named exports except `_component.tsx` files (default export). `ProtectedRoute` is a named export — `import { ProtectedRoute } from '@/components/ProtectedRoute'`.
- **No new frameworks:** Do not introduce new frameworks. Phase 1 uses only existing code.

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/ProtectedRoute.tsx` — read directly; canonical guard API, props, redirect behavior
- `frontend/src/components/protected-route.tsx` — read directly; legacy guard behavior, zero-prop API
- `frontend/src/contexts/auth-context.tsx` — read directly; role values, `getDefaultRoute`, `useAuth`
- `frontend/src/routes/**` — grep + direct reads; confirmed all 15 legacy importers, 18 canonical users, 2 `.bak` files
- `npm run build` output — run directly; confirmed build passes pre-migration
- `npm run test -- --run` output — run directly; confirmed Vitest passes (3 tests)
- `.planning/phases/01-canonical-guard/01-CONTEXT.md` — locked decisions D-01 through D-05
- `./CLAUDE.md` — project constraints

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — codebase analysis confirming dual-guard anti-pattern and exact list of legacy importers
- `.planning/codebase/CONVENTIONS.md` — naming patterns, module design rules

---

## Metadata

**Confidence breakdown:**
- Migration inventory: HIGH — every file confirmed by filesystem grep
- Guard API: HIGH — source code read directly
- routeTree.gen.ts non-regeneration: HIGH — no structural route changes; confirmed by inspecting the generated file
- official/profile anomaly: HIGH — confirmed by direct file read; status as out-of-scope or in-scope is an open question for the planner

**Research date:** 2026-05-20
**Valid until:** This research describes static source files — valid until files change. Not time-sensitive.
