# Requirements: Janus 2.0 — Frontend Consolidation

**Defined:** 2026-05-20
**Core Value:** Authorized staff can manage people, organizations, and access grants through one role-aware UI without exposing data to unauthorized users.

## v1 Requirements

Requirements for the Frontend Consolidation milestone. Each maps to a roadmap phase.

### Route Architecture

- [ ] **ROUTE-01**: `admin/dashboard` is a thin route wrapper that lazy-loads its `_component.tsx`; build passes
- [ ] **ROUTE-02**: `admin/person` is a thin route wrapper that lazy-loads its `_component.tsx`; build passes
- [ ] **ROUTE-03**: `admin/discussions` uses the new component file structure as a route; build passes
- [ ] **ROUTE-04**: `routeTree.gen.ts` is regenerated (not hand-edited) and all new route directories are committed to git
- [ ] **ROUTE-05**: Duplicate non-admin/admin route file pairs are removed or unified into a single shared, role-parameterized route

### Access Guards

- [ ] **GUARD-01**: A single canonical `ProtectedRoute` component (PascalCase, `allowedRoles`-aware) is the only guard in the codebase
- [ ] **GUARD-02**: All route files (~15) are migrated off the old `protected-route.tsx` and declare correct `allowedRoles`
- [ ] **GUARD-03**: The old `protected-route.tsx` is deleted with no remaining imports, and role-based access is not regressed

### Testing

- [ ] **TEST-01**: E2E specs are updated from `/personnel` URLs and "Personnel" labels to the current `/admin/person` routes/labels and run against the current app
- [ ] **TEST-02**: The Vitest unit run excludes Playwright e2e specs and passes green

### Cleanup

- [ ] **CLEAN-01**: The stale `frontend/src/routes/admin/update_admin_routes.sh` migration script is deleted

## v2 Requirements

Deferred to future milestones. Tracked but not in this roadmap.

### Backend Security (next milestone)

- **SEC-01**: Role-based authorization middleware enforced on person, access, organizations, nda, discussions, info_systems endpoints
- **SEC-02**: Backend panics if `JWT_SECRET` is unset in non-test builds (no hardcoded fallback)
- **SEC-03**: CORS restricted to the configured frontend origin (no allow-all with credentials)
- **SEC-04**: `password_hash` removed from all Person API responses via a response DTO
- **SEC-05**: Audit logging extended to all create/update/delete handlers (not just NDA)

### Backend Bugfixes (next milestone)

- **BUG-01**: `/api/vendors/<id>/relations` returns valid data (entity_type validation fixed)
- **BUG-02**: Person-relations-by-`person_id` backend endpoint implemented

## Out of Scope

Explicitly excluded from this milestone. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Backend RBAC / JWT / CORS / password_hash fixes | Cross-cutting security work; dedicated next milestone (see v2 SEC-*) |
| Broken/missing backend relations endpoints | Backend bugs; next milestone (see v2 BUG-*) |
| httpOnly cookie auth migration | Depends on backend auth changes; deferred |
| Replacing native `alert()` with toasts | UX polish, not consolidation-critical; deferred |
| New product features | This milestone is cleanup/consolidation only |

## Traceability

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUTE-01 | TBD | Pending |
| ROUTE-02 | TBD | Pending |
| ROUTE-03 | TBD | Pending |
| ROUTE-04 | TBD | Pending |
| ROUTE-05 | TBD | Pending |
| GUARD-01 | TBD | Pending |
| GUARD-02 | TBD | Pending |
| GUARD-03 | TBD | Pending |
| TEST-01 | TBD | Pending |
| TEST-02 | TBD | Pending |
| CLEAN-01 | TBD | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 11 ⚠️

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after initial definition*
