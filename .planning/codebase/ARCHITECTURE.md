<!-- refreshed: 2026-06-18 -->
# Architecture

**Analysis Date:** 2026-06-18

## System Overview

```text
┌───────────────────────────────────────────────────────────────┐
│                  Browser (React SPA :15510)                    │
│  Routes (TanStack file-based)  ·  Demo/Spike subsystems       │
├────────────────┬──────────────────┬───────────────────────────┤
│  Auth / RBAC   │   React Query    │    WebSocket Context       │
│  AuthContext   │   hooks (cache)  │    :15540                  │
│ `contexts/`    │  `hooks/`        │  `contexts/`               │
└───────┬────────┴────────┬─────────┴─────────────┬─────────────┘
        │  REST /api/*    │                        │  WS
        ▼                 ▼                        ▼
┌───────────────────────────────────────────────────────────────┐
│                  Rocket HTTP API (:15520)                      │
│  Domain modules: person · access · roles · nda · audit …     │
│  `backend/src/<domain>/handlers.rs`                           │
│  Cross-cutting: AuthGuard (JWT) · CORS · PgPool               │
│  `backend/src/shared/`                                        │
└───────────────────────────────┬───────────────────────────────┘
                                │ sqlx
                                ▼
┌───────────────────────────────────────────────────────────────┐
│             PostgreSQL (:15530)                                │
│             Migrations: `backend/migrations/`                 │
└───────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `create_rocket()` | Wire DB pool, CORS, JWT secret, mount all routes | `backend/src/shared/rocket_setup.rs` |
| `AuthGuard` | Per-request Bearer JWT validation on every non-login handler | `backend/src/auth/middleware.rs` |
| `rbac::role_has_permission` | DB-backed permission check by role name + permission key | `backend/src/shared/rbac.rs` |
| `ApiResponse<T>` / `PaginatedResponse<T>` | Canonical JSON envelope for all responses | `backend/src/shared/response.rs` |
| `AuthProvider` / `useAuth` | JWT storage (localStorage), login/logout, role access | `frontend/src/contexts/auth-context.tsx` |
| `WebSocketProvider` | Connects to WS :15540, propagates messages | `frontend/src/contexts/websocket-context.tsx` |
| `ProtectedRoute` (PascalCase) | Role-based guard — checks `allowedRoles` | `frontend/src/components/ProtectedRoute.tsx` |
| `apiFetch` / `api.*` | HTTP client — injects Bearer token, throws `ApiError` | `frontend/src/lib/api.ts` |
| React Query hooks (`use-*.ts`) | Server-state cache layer between pages and `apiFetch` | `frontend/src/hooks/` |
| Demo world-state store | In-memory ABAC/grant simulation via `useReducer` | `frontend/src/demo/store/world-state.tsx` |

## Pattern Overview

**Overall:** Layered monolith — Rocket REST + React SPA with a parallel in-memory demo/spike subsystem

**Key Characteristics:**
- Backend: flat domain modules, no service layer — handlers query `PgPool` directly with inline `sqlx`
- Frontend: TanStack file-based routes; data fetched via React Query hooks, never in route components directly
- Auth: JWT-based; token lives in `localStorage`; injected by `apiFetch`; enforced server-side by `AuthGuard` request guard
- Demo subsystem (`src/demo/`) is an entirely self-contained offline simulation — no backend calls

## Layers

**Backend — Domain Handlers:**
- Purpose: HTTP request handling + SQL queries + response serialization
- Location: `backend/src/<domain>/handlers.rs`
- Contains: Rocket `#[get]`/`#[post]`/`#[put]`/`#[delete]` functions
- Depends on: `sqlx::PgPool`, `AuthGuard`, `shared/response.rs`
- Used by: Rocket router (mounted in `rocket_setup.rs`)

**Backend — Domain Models:**
- Purpose: sqlx + serde structs for DB rows and API payloads
- Location: `backend/src/<domain>/models.rs`
- Contains: `#[derive(sqlx::FromRow, Serialize, Deserialize)]` structs
- Depends on: nothing (plain structs)
- Used by: handlers

**Backend — Shared Infrastructure:**
- Purpose: Cross-cutting concerns: DB setup, JWT, RBAC, pagination, error types
- Location: `backend/src/shared/`
- Contains: `rocket_setup.rs`, `auth/middleware.rs`, `rbac.rs`, `response.rs`, `pagination.rs`, `error.rs`, `database.rs`
- Depends on: external crates (sqlx, rocket, jwt)
- Used by: all domain handlers

**Frontend — Routes:**
- Purpose: Page components organized by role subtree
- Location: `frontend/src/routes/`
- Contains: `admin/`, `enduser/`, `official/` subtrees + flat legacy routes
- Depends on: React Query hooks, `ProtectedRoute`, `Layout`
- Used by: TanStack Router

**Frontend — React Query Hooks:**
- Purpose: Server-state cache; wrap `apiFetch` calls; expose `useQuery`/`useMutation`
- Location: `frontend/src/hooks/use-*.ts`
- Contains: `use-person.ts`, `use-access.ts`, `use-nda.ts`, `use-roles.ts`, etc.
- Depends on: `src/lib/api.ts`, `src/types/`
- Used by: route components

**Frontend — Demo Subsystem:**
- Purpose: Offline ABAC/grant/zone simulation for prototyping — no backend required
- Location: `frontend/src/demo/`
- Contains: `lib/model.ts` (types), `lib/seed.ts` (fixture data), `lib/abac.ts`, `lib/policy.ts`, `store/world-state.tsx` (useReducer store), `components/`, `DemoRoot.tsx`
- Depends on: nothing outside `src/demo/` and `src/spikes/`

**Frontend — Spike Subsystem:**
- Purpose: Earlier prototype implementations of ABAC, audit, contracts — read-only reference
- Location: `frontend/src/spikes/`
- Contains: `lib/*.ts` (models + logic), `components/`

## Data Flow

### Primary REST Request Path

1. User action in route component (`frontend/src/routes/admin/person/_component.tsx`)
2. `useMutation` / `useQuery` hook in `frontend/src/hooks/use-person.ts`
3. `apiFetch('/api/person', ...)` → `frontend/src/lib/api.ts` adds `Authorization: Bearer <token>`
4. Rocket receives request → `AuthGuard` validates JWT (`backend/src/auth/middleware.rs`)
5. Handler function in `backend/src/person/handlers.rs` runs inline `sqlx` query against `PgPool`
6. Handler returns `Json<PaginatedResponse<Person>>` or `Result<Json<T>, Status>`
7. React Query caches response; component re-renders

### WebSocket Flow

1. `WebSocketProvider` connects to `ws://localhost:15540` on mount (`frontend/src/contexts/websocket-context.tsx`)
2. WS server validates JWT on handshake (`backend/src/messaging/handlers.rs`)
3. Backend events broadcast via `WebSocketManager` (`backend/src/messaging/websocket.rs`)
4. Frontend consumers read from `WebSocketContext`

### Demo / ABAC Evaluation Flow (offline)

1. `DemoRoot.tsx` wraps tree with `WorldStateProvider` (from `frontend/src/demo/store/world-state.tsx`)
2. User actions dispatch reducer actions → new immutable world state
3. Views call `useMemo(evaluate(...))` to derive access decisions — never stored in state
4. `AttrEvent` log appended on every mutation for event-sourced audit trail

**State Management:**
- Server state: React Query (keyed by entity type + ID)
- Auth state: `AuthContext` (React context + `localStorage`)
- Demo/simulation state: `useReducer` in `WorldStateProvider` (no persistence)
- No global client state store (Redux etc.) — all state is either server-synced or context-local

## Key Abstractions

**`ApiResponse<T>` / `PaginatedResponse<T>`:**
- Purpose: Uniform JSON envelope for all backend responses
- Examples: `backend/src/shared/response.rs`
- Pattern: `{success, data, error}` for single items; `{items, total, page, per_page, total_pages}` for lists

**`AuthGuard` (Rocket request guard):**
- Purpose: Validates `Authorization: Bearer` JWT on every protected handler
- Examples: `backend/src/auth/middleware.rs`
- Pattern: Implement `FromRequest` — returns `Outcome::Forward` on failure

**`ProtectedRoute` (React component, PascalCase):**
- Purpose: Wraps route trees to enforce `allowedRoles`; redirects unauthenticated users
- Examples: `frontend/src/components/ProtectedRoute.tsx`
- Pattern: `<ProtectedRoute allowedRoles={['admin']}><Page /></ProtectedRoute>`

**Domain Module (Rust):**
- Purpose: Self-contained vertical slice per domain
- Examples: `backend/src/person/`, `backend/src/access/`, `backend/src/nda/`
- Pattern: `mod.rs` (exports + `routes()`), `models.rs` (structs), `handlers.rs` (Rocket fns)

**React Query Hook (`use-*.ts`):**
- Purpose: Encapsulate `useQuery`/`useMutation` for a domain, expose typed data + mutations
- Examples: `frontend/src/hooks/use-person.ts`, `frontend/src/hooks/use-access.ts`
- Pattern: `export function usePersons() { return useQuery({...}) }`

## Entry Points

**Backend:**
- Location: `backend/src/main.rs` → `shared::rocket_setup::create_rocket()`
- Triggers: `cargo run` in `backend/`
- Responsibilities: Load `.env`, connect DB pool, spawn WS server, configure CORS, mount all routes

**Frontend:**
- Location: `frontend/src/main.tsx` → `RouterProvider`
- Triggers: `npm run dev` in `frontend/`
- Responsibilities: Mount React tree with TanStack Router; root layout provides `AuthProvider` + `WebSocketProvider`

**Route Index:**
- Location: `frontend/src/routes/index.tsx`
- Responsibilities: Redirect `/` to role-appropriate default route via `getDefaultRoute(role)`

## Architectural Constraints

- **No service layer (backend):** Handlers call `sqlx` directly on `PgPool` — no service/repository abstraction exists
- **Route tree generation:** `frontend/src/routeTree.gen.ts` is GENERATED by TanStack — never hand-edit; regenerate after adding route files
- **API prefix discipline:** `apiFetch` base URL has no `/api` suffix; every endpoint string passed to it MUST start with `/api/...`
- **Backend route mount prefix:** domain handlers use relative paths (e.g. `#[get("/<id>")]`); the prefix is set in `rocket_setup.rs` (`.mount("/api/person", ...)`)
- **WebSocket port (:15540):** spawned as a separate `tokio::spawn` task inside `create_rocket()` — auth failures cause a reconnect flood in frontend console (known, non-blocking)
- **Global state:** `PgPool`, `jwt_secret` (String), and `WebSocketManager` are Rocket managed state (module-level singletons injected at startup)

## Anti-Patterns

### Flat (legacy) route files

**What happens:** Routes directly under `frontend/src/routes/` (e.g. `src/routes/access/`, `src/routes/ndas/`, `src/routes/roles/`) duplicate pages that exist under `src/routes/admin/`
**Why it's wrong:** These are unlinked pre-pivot duplicates carrying stale bugs; they are NOT part of the active navigation
**Do this instead:** Work exclusively in `frontend/src/routes/admin/`, `enduser/`, `official/` subtrees; do not revive or edit the flat routes

### lowercase `protected-route.tsx`

**What happens:** `frontend/src/components/protected-route.tsx` (lowercase) exists alongside `ProtectedRoute.tsx` (PascalCase)
**Why it's wrong:** Lowercase version is auth-only (no `allowedRoles`); using it skips role enforcement
**Do this instead:** Always import from `@/components/ProtectedRoute` (PascalCase) for role-aware guards

## Error Handling

**Strategy:** Backend returns typed HTTP status codes; frontend surfaces inline errors

**Patterns:**
- Backend: `Result<Json<T>, Status>` — `.map_err(|_| Status::InternalServerError)?`, `.ok_or(Status::NotFound)?`
- Frontend: `ApiError{status}` thrown by `apiFetch`; caught in React Query's `error` state; rendered inline as `bg-destructive/10 text-destructive` div; no toast notifications
- Mutations: use `mutateAsync` in handlers; gate submit buttons on `mutation.isPending`

## Cross-Cutting Concerns

**Logging:** Backend uses `RUST_LOG=info` via `tracing`/`env_logger`; frontend has no structured logging
**Validation:** Backend: `validate().map_err(|_| Status::BadRequest)?`; Frontend: inline form validation in route components
**Authentication:** JWT issued at login (`/api/auth/login`), stored in `localStorage`, injected by `apiFetch`, validated by `AuthGuard` on every backend request

---

*Architecture analysis: 2026-06-18*
