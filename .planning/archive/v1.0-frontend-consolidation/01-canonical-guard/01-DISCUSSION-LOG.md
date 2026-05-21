# Phase 1: Canonical Guard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 1-Canonical Guard
**Areas discussed:** Role mapping for auth-only routes, admin/profile.tsx anomaly, .bak files + sed script, No-regression verification

---

## Role mapping for auth-only routes

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve: all 3 roles | Migrate each with `allowedRoles={['admin','enduser','official']}`. Zero behavior change, zero regression. Consolidation-only intent; tightening is v2 (SEC-*); Phase 2 deletes most dupes. | ✓ |
| Tighten per audience | Assign restrictive roles now (roles/ndas/audit/access → admin-only). Security improvement but behavior change + regression risk; belongs to RBAC milestone. | |
| You decide per route | Claude infers sensible roles per route audience. Middle ground but introduces judgment calls / behavior changes. | |

**User's choice:** Preserve: all 3 roles
**Notes:** Keeps Phase 1 a pure consolidation. Admin-pathed-but-auth-only `routes/admin/info-systems.tsx` also gets all 3 under the rule; revisit in Phase 2.

---

## admin/profile.tsx anomaly

| Option | Description | Selected |
|--------|-------------|----------|
| Fix to ['admin'] | Lives in admin/ tree; separate enduser/official profile pages exist → `['enduser']` is a sed bug. Correcting a guard declaration is in scope. | ✓ |
| Leave untouched | Keep buggy `['enduser']`; strictly mechanical migration. Ships a known-wrong guard. | |

**User's choice:** Fix to ['admin']

---

## .bak files + sed script

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the 2 .bak files now | Dead route variants importing the legacy guard; block GUARD-03 zero-imports. Clean path to deletion. | ✓ |
| Migrate .bak files too | Swap import to canonical guard; keeps dead files for no benefit. | |

**User's choice:** Delete the 2 .bak files now
**Notes:** `update_admin_routes.sh` references the guard only in sed text (not an import) → left for Phase 4 / CLEAN-01.

---

## No-regression verification

| Option | Description | Selected |
|--------|-------------|----------|
| Manual per-role click-through | Matches Success Criterion 5 wording ("manually visiting"). No test infra pulled forward. | ✓ |
| Add a ProtectedRoute unit test | Vitest redirect-on-wrong-role test; stronger but pulls Phase 3 scope in. | |
| Both | Manual + small unit test; most thorough, most scope bleed. | |

**User's choice:** Manual per-role click-through

---

## Claude's Discretion

- Migration mechanics (edit order, script vs hand-edit), import-path formatting, final `grep` sweep.
- Whether `routeTree.gen.ts` needs regeneration (expected: no — no route dirs added/removed).

## Deferred Ideas

- Per-audience access tightening — v2 backend-RBAC (SEC-*).
- Duplicate route-pair removal/unification — Phase 2 (ROUTE-05).
- Delete `update_admin_routes.sh` — Phase 4 (CLEAN-01).
- Re-evaluate `routes/admin/info-systems.tsx` role scope after consolidation — Phase 2.
