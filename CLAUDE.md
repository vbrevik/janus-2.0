# CLAUDE.md — 8-Rule Architecture

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding
State assumptions explicitly. If uncertain, ask rather than guess. Push back when a simpler approach exists. Stop when confused.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative. No features beyond what was asked. No abstractions for single-use code.

## Rule 3 — Surgical Changes
Touch only what you must. Clean up only your own mess. Don't "improve" adjacent code, comments, or formatting. Match existing style.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified. Don't blindly follow steps — define success and iterate independently.

## Rule 5 — Token Budgets Are Not Advisory
Per-task: ~4,000 tokens. Per-session: ~30,000 tokens. If approaching budget, summarize and start fresh. Surface the breach.

## Rule 6 — Read Before You Write
Before adding code, read the file's exports, immediate callers, and shared utilities. If unsure why code is structured a certain way, ask.

## Rule 7 — Checkpoint After Every Significant Step
Summarize what was done, what's verified, what's left. Don't continue from a state you can't describe back. Stop and restate.

## Rule 8 — Fail Loud
"Completed" is wrong if anything was skipped silently. "Tests pass" is wrong if any were skipped. Default to surfacing uncertainty, not hiding it.

---

## Project

**Janus 2.0** — a security-clearance and access-management system: tracks personnel, organizations, information systems, NDAs, and three-tier access grants (computer/data/physical) with audit logging and role-based dashboards. Internal admin tool: Rust/Rocket REST API + PostgreSQL backend, React + TanStack SPA frontend.

**Core value:** authorized staff manage people, orgs, and their access grants through one role-aware UI, without data ever being exposed to or mutated by an unauthorized user.

### Constraints
- **Stack (match it; introduce no new frameworks):** Rust 1.87 + Rocket 0.5 + sqlx/PostgreSQL (backend); React 19 + TanStack Router/Query + Vite + shadcn/ui (Radix) (frontend).
- **Ports (dev):** frontend 15510, backend 15520, postgres 15530, WebSocket 15540.
- **Routing:** TanStack file-based; `frontend/src/routeTree.gen.ts` is GENERATED — never hand-edit. Regenerate after route changes; commit new route dirs first.
- **Security:** never regress the role-aware guards. Canonical guard = PascalCase `ProtectedRoute` with `allowedRoles` (`frontend/src/components/ProtectedRoute.tsx`). A lowercase `protected-route.tsx` is auth-only — don't confuse them.
- **Testing:** Vitest (unit, jsdom) + Playwright (e2e — must be excluded from the Vitest run).

## Commands
```bash
# 1. Database first — Postgres on :15530
docker compose -f docker-compose.dev.yml up -d
# 2. Backend — :15520 HTTP, :15540 WS
cd backend && RUST_LOG=info cargo run
# 3. Frontend — :15510
cd frontend && npm run dev
# Tests
cd frontend && npm run test            # Vitest unit (jsdom)
cd frontend && npx playwright test      # e2e (auto-starts frontend; backend + DB must be up)
cd frontend && npm run lint             # ESLint
cd frontend && npm run build            # tsc -b && vite build
```
Seed users (all password `password123`): `admin`, `manager`, `operator`, `viewer`. Login redirects by role: admin → `/admin/dashboard`, enduser → `/enduser/tasks`, official → `/official/dashboard` (`getDefaultRoute` in `auth-context.tsx`). No `enduser`/`official` seed users exist yet.

## Gotchas (read before touching these)
- **Frontend API prefix:** `src/lib/api.ts` base is the host WITHOUT `/api`. Every endpoint string passed to `apiFetch`/`api.*` must start with `/api/...` (e.g. `/api/person`). Omitting it 404s silently.
- **Backend route mounts:** modules mounted at `/api/<x>` use RELATIVE handler paths (`#[get("/<id>")]`). Don't also hardcode `/api/...` in the macro — that double-prefixes the URL.
- **Empty `<SelectItem value="">` crashes the whole page** — Radix throws, the root error boundary shows a blank "Something went wrong". Use a sentinel (`value="ALL"`) and treat it as "no filter".
- **Schema drift / migrations:** `sqlx migrate run` fails on a clean DB (ALTER-before-CREATE, dup versions, zombie rename migrations). The live dev DB also drifts from the code — some tables still use `personnel_id`/`issued_by` and FKs to a dead `users` table while code expects `person_id`/`person`. Verify column/FK names against the live DB before writing SQL.
- **Clearance levels** are `UNCLASSIFIED | CONFIDENTIAL | SECRET | TOP_SECRET` (DB CHECK constraint) — not `NONE`.
- **`Dialog` is hand-rolled** (`components/ui/dialog.tsx`), not Radix. It now sets `role="dialog"`; it has no focus-trap/portal niceties.
- **WebSocket server (:15540) rejects auth** → the frontend reconnect loop floods the console. Ignore it in tests; don't chase it.
- **Deprecated flat routes** (`src/routes/{access,roles,ndas,organizations,...}`) are unlinked pre-pivot duplicates of the `/admin/*` pages and still carry the bugs above. Work in `/admin/*`; don't revive the flat ones.
- **`App.tsx` is unused** (Vite scaffold leftover); real entry is `main.tsx` + `routes/__root.tsx`.

## Architecture
- **Backend** — flat domain modules under `backend/src/<domain>/`, each = `mod.rs` (exports + `routes()`), `models.rs` (sqlx/serde structs), `handlers.rs` (Rocket fns). **No service layer:** handlers query `PgPool` directly via inline `sqlx`. `shared/` holds cross-cutting infra: `rocket_setup.rs` (connect DB, mount routes, spawn WS), `response.rs` (`PaginatedResponse<T>` = `{items,total,page,per_page,total_pages}` + `ApiResponse<T>`), `pagination.rs`, `error.rs`, `rbac.rs`, `auth/middleware.rs` (`AuthGuard` Bearer-JWT request guard on every non-login handler).
- **Frontend** — TanStack file-based routes under `src/routes/`, with role subtrees `admin/`, `enduser/`, `official/`; heavy page logic in co-located `_component.tsx`. Data layer: React Query hooks in `src/hooks/use-*.ts` → `src/lib/api.ts` (`apiFetch`, `ApiError{status}`, auth-header injection). Global state: `AuthContext` (JWT in `localStorage`) + `WebSocketContext`, provided in `routes/__root.tsx`. `Layout` = shared chrome (role nav, profile dropdown, logout).
- **Domains:** person (unified users+contacts), organizations, roles/permissions, nda, discussions, relations, access (computer/data/physical), audit, info_systems, messaging (WS).
- **Entry points:** backend `main.rs` → `shared::rocket_setup::create_rocket()`; frontend `main.tsx` → `RouterProvider`; `routes/index.tsx` redirects `/` by role.

## Conventions
- **Imports:** use `@/` (→ `src/`) for all frontend internal imports; never `../../`.
- **Naming:** TS files kebab-case, React components PascalCase, hooks `useXxx`; Rust files/fns snake_case, types/structs PascalCase; DB string enums SCREAMING_SNAKE_CASE.
- **Errors:** backend handlers return `Result<Json<T>, Status>` (never panic) — `validate().map_err(|_| Status::BadRequest)?`, `.map_err(|_| Status::InternalServerError)?`, `.ok_or(Status::NotFound)?`. Frontend: `ApiError{status}` propagates; render inline (`bg-destructive/10 text-destructive`), no toasts; use `mutateAsync` in handlers and gate buttons on `mutation.isPending`.
- **Style:** single quotes, trailing commas, ESLint 9 flat config (no prettier); strict TS (`noUnusedLocals`/`noUnusedParameters`); Rust `rustfmt`; raw SQL in `r#"..."#`.

## Project Skills
- **Spike findings for janus-2.0** (patterns, constraints, gotchas) → `Skill("spike-findings-janus-2.0")`

## GSD Workflow Enforcement
Before Edit/Write/file changes, start through a GSD command so planning artifacts stay in sync: `/gsd-quick` (small fixes, docs), `/gsd-debug` (investigation, bugs), `/gsd-execute-phase` (planned work). Don't make direct repo edits outside a GSD workflow unless explicitly told to bypass it.

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
