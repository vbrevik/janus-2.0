# Janus 2.0

## What This Is

Janus 2.0 is a security clearance and access-management system for tracking personnel, organizations, information systems, NDAs, and three-tier access grants (computer, data, physical) with audit logging and role-based dashboards. It is an internal admin tool: a Rust/Rocket REST API backed by PostgreSQL, with a React + TanStack SPA front end.

## Core Value

Authorized staff can manage people, organizations, and their access grants through one role-aware UI without the data ever being exposed to or mutated by an unauthorized user.

## Requirements

### Validated

<!-- Inferred from existing code (brownfield). Shipped and relied upon. -->

- ✓ JWT auth: login, profile, password change (bcrypt) — existing
- ✓ Person CRUD with pagination and soft delete — existing
- ✓ Organization CRUD (renamed from vendors) — existing
- ✓ Information Systems CRUD — existing
- ✓ Three-tier access grants (computer/data/physical) + revoke — existing
- ✓ Roles & permissions module with per-endpoint `role_has_permission()` checks — existing
- ✓ NDA management with audit logging and S3/MinIO attachments — existing
- ✓ Discussions + WebSocket messaging (separate WS server on :15540) — existing
- ✓ Audit log query UI — existing
- ✓ Role-based navigation and route guards (frontend) — existing
- ✓ Consolidated single front end (replaced multiple older frontends) — existing

### Active

<!-- This milestone: Frontend Consolidation (completion). -->

- [ ] Finish the in-progress route component-split: `admin/dashboard`, `admin/person`, `admin/discussions` become thin route wrappers that lazy-load `_component.tsx`, with `routeTree.gen.ts` regenerated and the build green
- [ ] Collapse the two competing `ProtectedRoute` implementations into one (the PascalCase, `allowedRoles`-aware version)
- [ ] Migrate all route files off the old `protected-route.tsx` (~15 files) and delete it
- [ ] Remove duplicate non-admin/admin route file pairs (or parameterize a single shared route)
- [ ] Repair the broken E2E suite: update `/personnel` URLs and "Personnel" text to current `/admin/person` routes/labels
- [ ] Delete the stale `frontend/src/routes/admin/update_admin_routes.sh` migration script

### Out of Scope

- Backend role-based authorization middleware — deferred to the Security milestone (backlog); large cross-cutting change, see Key Decisions
- JWT secret hardcoded fallback, CORS allow-all, `password_hash` in API responses — deferred to the Security milestone (backlog)
- Broken `/api/vendors/<id>/relations` endpoint and missing person-relations endpoint — backend bugs, deferred to a backend milestone
- New product features — this milestone is consolidation/cleanup only, not feature work
- httpOnly cookie auth migration — deferred (depends on backend auth changes)

## Context

- **Brownfield.** Full codebase map in `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).
- The current branch `feature/frontend-consolidation` has uncommitted WIP: the route component-split is partially done (untracked `admin/dashboard/_component.tsx`, `admin/person/_component.tsx`, `admin/discussions/index.tsx`) plus a WebSocket reconnect fix and a newly bootstrapped Vitest setup.
- Recent history completed a personnel→person and vendors→organizations rename and removed the old frontends; the consolidation theme is ~80% done but trails duplicate components and broken tests.
- `CONCERNS.md` documents significant security debt (no backend RBAC, JWT fallback, CORS allow-all, `password_hash` leak) and known backend bugs — intentionally parked for follow-on milestones.

## Constraints

- **Tech stack**: Rust 1.87 + Rocket 0.5 + sqlx/PostgreSQL (backend); React 19 + TanStack Router/Query + Vite + shadcn/ui (frontend) — match existing patterns, do not introduce new frameworks.
- **Routing**: TanStack file-based router; `routeTree.gen.ts` is generated — must be regenerated (not hand-edited) after route changes, and new route dirs committed before regen.
- **Ports**: frontend 15510, backend 15520, postgres 15530, WebSocket 15540 (dev).
- **Testing**: Vitest (unit, jsdom) + Playwright (e2e, must be excluded from the Vitest run).
- **Security**: do not regress the role-aware UI guards while consolidating; the PascalCase `ProtectedRoute` with `allowedRoles` is the canonical one.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| First GSD milestone = finish Frontend Consolidation | The WIP refactor is entangled with duplicate routes/guards and broken tests; closing the whole theme prevents double-maintenance | — Pending |
| Security debt parked for a dedicated next milestone | Backend RBAC/JWT/CORS/password_hash are cross-cutting and risky; bundling them would bloat this milestone | — Pending |
| Canonical guard = `ProtectedRoute.tsx` (PascalCase, `allowedRoles`) | It enforces roles via `<Navigate>`; the lowercase variant has no role check and a stale `useEffect` pattern | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 after initialization*
