# Phase 1: Canonical Guard - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `frontend/src/components/ProtectedRoute.tsx` (PascalCase, `allowedRoles`-aware)
the single canonical route guard. Migrate every importer of the legacy
`frontend/src/components/protected-route.tsx` (auth-only, no role check) onto the
canonical guard, then delete the legacy file. No role-based access regression.

**In scope:** guard consolidation, importer migration, `allowedRoles` declarations,
deleting the legacy guard, deleting dead `.bak` route variants that block the deletion.

**Out of scope:** removing/unifying duplicate route file pairs (Phase 2 / ROUTE-05),
deleting `update_admin_routes.sh` (Phase 4 / CLEAN-01), test infrastructure
(Phase 3 / TEST-01/02), backend RBAC / access tightening (v2 SEC-*).
</domain>

<decisions>
## Implementation Decisions

### Role mapping for migrated legacy (auth-only) routes
- **D-01:** All legacy auth-only routes migrate to `allowedRoles={['admin','enduser','official']}`.
  The legacy guard performed no role check (any authenticated user), so granting all three
  roles preserves current behavior exactly — zero regression. Access-tightening is explicitly
  deferred to the v2 backend-RBAC milestone (SEC-*), and Phase 2 (ROUTE-05) removes most of
  these duplicate routes anyway.
- **D-02:** This preserve-behavior rule is uniform across all 15 live legacy importers,
  including `routes/admin/info-systems.tsx` — it is admin-pathed but currently auth-only, so
  under the preserve rule it also receives all three roles. Revisit during Phase 2 consolidation.

### Guard-declaration anomaly
- **D-03:** Fix `routes/admin/profile.tsx`: change `allowedRoles={['enduser']}` →
  `allowedRoles={['admin']}`. It lives in the `admin/` tree and separate `enduser/` and
  `official/` profile pages exist, so `['enduser']` is a `sed`-script artifact, not intent.
  Correcting a guard declaration is in Phase 1 scope.

### Dead-file cleanup (to unblock GUARD-03)
- **D-04:** Delete `routes/person/$personnelId.tsx.bak` and
  `routes/admin/person/$personnelId.tsx.bak`. They import the legacy guard and are dead
  variants (TanStack router ignores `.bak`), so they block the "zero remaining imports"
  requirement. `update_admin_routes.sh` only references the guard name inside `sed` strings
  (not a real import) — leave it for Phase 4 / CLEAN-01.

### No-regression verification
- **D-05:** Verify via manual per-role click-through (log in as admin / enduser / official,
  confirm an admin route still redirects a non-admin). Matches Success Criterion 5's exact
  wording ("manually visiting"). No unit test added — formal testing is Phase 3.

### Claude's Discretion
- Migration mechanics (edit order, whether to script vs hand-edit each file), import-path
  formatting, and whether to run a final `grep` sweep to prove zero residual imports.
- Whether `routeTree.gen.ts` needs regeneration (no route dirs are added/removed in Phase 1;
  deleting `.bak` files does not change the generated tree).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 1: Canonical Guard" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` § "Access Guards" — GUARD-01, GUARD-02, GUARD-03 (+ Out of Scope table)

### Guard components
- `frontend/src/components/ProtectedRoute.tsx` — canonical role-aware guard (`allowedRoles`,
  declarative `<Navigate>`, redirects unauthenticated → `/login?redirect=...`, wrong-role →
  `getDefaultRoute(user.role)`)
- `frontend/src/components/protected-route.tsx` — legacy auth-only guard to be deleted
- `frontend/src/contexts/auth-context.tsx` — `useAuth`, `getDefaultRoute`, role values
  (`admin` | `enduser` | `official`)

### Codebase maps
- `.planning/codebase/CONCERNS.md` — documents the dual-guard anti-pattern
- `.planning/codebase/CONVENTIONS.md` — guard usage + naming conventions
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProtectedRoute.tsx` (canonical): already used by 18 route files with correct `allowedRoles`
  (admin/* → `['admin']`, official/* → `['official']`, enduser/* → `['enduser']`). It is the
  migration target — no changes needed to the component itself.
- `getDefaultRoute()` in `auth-context.tsx`: canonical guard already uses it for wrong-role
  redirects; behavior is consistent post-migration.

### Established Patterns
- Canonical guard wraps page bodies declaratively: `<ProtectedRoute allowedRoles={[...]}>…</ProtectedRoute>`.
- Legacy guard differs: imperative `useEffect`+`navigate`, returns `null` when unauthenticated,
  no `redirect` search param. Canonical behavior is a strict superset — safe to replace.

### Integration Points — legacy importers to migrate (15 live)
- `routes/dashboard.tsx`, `routes/profile.tsx`, `routes/tasks.tsx`
- `routes/person/index.tsx`, `routes/person/$personId.tsx`, `routes/person-relations/index.tsx`
- `routes/organizations/index.tsx`, `routes/organizations/$organizationId.tsx`
- `routes/roles/index.tsx`, `routes/ndas/index.tsx`, `routes/audit/index.tsx`
- `routes/access/index.tsx`, `routes/access/view.tsx`
- `routes/info-systems.tsx`, `routes/admin/info-systems.tsx`

### Dead files to delete (block GUARD-03)
- `routes/person/$personnelId.tsx.bak`, `routes/admin/person/$personnelId.tsx.bak`
</code_context>

<specifics>
## Specific Ideas

- After migration, `frontend/src/components/protected-route.tsx` must no longer exist on disk
  and `grep -r "components/protected-route" frontend/src` must return zero matches (GUARD-03).
- `npm run build` must pass post-migration (Success Criterion 4).
</specifics>

<deferred>
## Deferred Ideas

- Tightening route access (restrictive per-audience `allowedRoles`) — v2 backend-RBAC milestone (SEC-*).
- Removing/unifying duplicate top-level vs admin/official/enduser route pairs — Phase 2 (ROUTE-05).
- Deleting `routes/admin/update_admin_routes.sh` — Phase 4 (CLEAN-01).
- Re-evaluating `routes/admin/info-systems.tsx` role scope once duplicates are consolidated — Phase 2.

</deferred>

---

*Phase: 1-Canonical Guard*
*Context gathered: 2026-05-20*
