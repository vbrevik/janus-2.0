---
title: Fix non-admin login redirect (stays on /login after successful auth)
created: 2026-07-03
priority: medium
area: frontend/auth
source: .planning/phases/12-demo-ui-tab-integration/12-UAT.md (informational note, found during Phase 12 UAT 2026-07-03)
---

# Fix non-admin login redirect

Logging in as a non-admin seed user (`viewer`, presumably also `operator`/`manager`)
succeeds — the backend returns 200, a valid JWT and `user` JSON land in localStorage —
but the app silently stays on `/login`. The post-login
`navigate({ to: defaultRoute })` in `frontend/src/routes/login.tsx:39` never takes
effect for these roles.

**Reproduce:** open `http://localhost:15510/login`, sign in as `viewer` / `password123`.
Token is stored (check localStorage) but the URL remains `/login` with the form still shown.
Admin login redirects to `/admin/dashboard` correctly.

**Likely suspects:** `getDefaultRoute` in `frontend/src/contexts/auth-context.tsx` maps
roles admin/enduser/official — seed roles `viewer`/`operator`/`manager` may fall through
to a route that doesn't exist or a guard that bounces back. Note CLAUDE.md: no
`enduser`/`official` seed users exist, and seed roles don't match the role-subtree names.

**Scope notes:** Pre-existing — predates Phase 12; not caused by any v2.2 work.

**Fixed 2026-07-04:** Added `manager`, `operator`, `viewer` cases to `getDefaultRoute` in `frontend/src/contexts/auth-context.tsx`. `manager`/`operator`/`viewer` now redirect to `/admin/dashboard`; default fallback uses `/admin/dashboard` instead of `/login`.
