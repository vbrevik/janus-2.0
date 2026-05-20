<!-- refreshed: 2026-05-20 -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                               │
│         `frontend/src/`                                              │
├────────────────┬──────────────────────┬──────────────────────────────┤
│  Route Layer   │   Context/Hooks      │     UI Components            │
│ `src/routes/`  │ `src/contexts/`      │  `src/components/`           │
│                │ `src/hooks/`         │  `src/components/ui/`        │
└────────┬───────┴──────────┬───────────┴────────────┬─────────────────┘
         │ HTTP (fetch)      │ WS                     │
         ▼                  ▼                         │
┌──────────────────────────────────────────────────────────────────────┐
│                 Rocket HTTP API  `backend/src/`                      │
├────────────┬────────────┬───────────────────────────────────────────┤
│   auth/    │   person/  │  organizations/ roles/ nda/ discussions/  │
│            │            │  relations/ access/ audit/ info_systems/   │
│            │            │  vendor_relations/ document_references/    │
│            │            │  messaging/                                │
└────────────┴────────────┴───────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│               PostgreSQL 15  (port 15530)                            │
│         sqlx + raw SQL — no ORM                                      │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼ (separate port)
┌───────────────────────────────────────┐
│  WebSocket Server  (port 15540)       │
│  `backend/src/messaging/`             │
└───────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `main.rs` | Binary entry point, delegates to `create_rocket()` | `backend/src/main.rs` |
| `lib.rs` | Library crate re-export for integration tests | `backend/src/lib.rs` |
| `shared/rocket_setup.rs` | Assembles Rocket app, mounts all routes, starts WS server | `backend/src/shared/rocket_setup.rs` |
| `auth` module | JWT creation/validation, login, password change | `backend/src/auth/` |
| `auth::middleware` | `AuthGuard` request guard enforcing Bearer token on routes | `backend/src/auth/middleware.rs` |
| `shared::rbac` | DB-backed permission check (`role_has_permission`) | `backend/src/shared/rbac.rs` |
| `shared::response` | `PaginatedResponse<T>` and `ApiResponse<T>` types | `backend/src/shared/response.rs` |
| `shared::pagination` | `PaginationParams` with offset/limit/validate | `backend/src/shared/pagination.rs` |
| `shared::error` | `AppError` enum implementing Rocket `Responder` | `backend/src/shared/error.rs` |
| `person` module | Unified CRUD for all person entities (users + contacts) | `backend/src/person/` |
| `organizations` module | Organization/department management | `backend/src/organizations/` |
| `roles` module | Role/permission management | `backend/src/roles/` |
| `nda` module | NDA lifecycle (create, sign, reject, status) | `backend/src/nda/` |
| `discussions` module | Threaded discussions with replies | `backend/src/discussions/` |
| `relations` module | Person-to-person and person-to-vendor relations | `backend/src/relations/` |
| `access` module | Computer/data/physical access grant/revoke | `backend/src/access/` |
| `audit` module | Audit log read-out | `backend/src/audit/` |
| `info_systems` module | Information system CRUD | `backend/src/info_systems/` |
| `messaging` module | WebSocket server on port 15540 | `backend/src/messaging/` |
| `AuthContext` | JWT token store (localStorage), login/logout, role helpers | `frontend/src/contexts/auth-context.tsx` |
| `WebSocketContext` | Global WS connection state, exposes `sendMessage` | `frontend/src/contexts/websocket-context.tsx` |
| `useXxx` hooks | React Query wrappers per domain (one hook file per backend module) | `frontend/src/hooks/` |
| Route components | Page-level views, co-located component files via `_component.tsx` | `frontend/src/routes/` |
| `ProtectedRoute` (upper) | Role-aware guard; redirects unauthenticated or wrong-role users | `frontend/src/components/ProtectedRoute.tsx` |
| `ProtectedRoute` (lower) | Auth-only guard (no role check) | `frontend/src/components/protected-route.tsx` |
| `Layout` | Shared chrome — role-specific nav, WS status, logout | `frontend/src/components/layout.tsx` |

## Pattern Overview

**Overall:** Layered monolith per service (backend = Rocket REST API + standalone WebSocket; frontend = file-based SPA)

**Key Characteristics:**
- Backend modules are flat domain modules (`person`, `roles`, etc.), each with `models.rs` + `handlers.rs` + `mod.rs`
- No service layer between handlers and database; handlers query `PgPool` directly via inline `sqlx` SQL
- Frontend uses file-system routing (TanStack Router) with auto-generated `routeTree.gen.ts`; route segments map to directory structure under `src/routes/`
- Data fetching is entirely React Query-based; hooks in `src/hooks/` are the single integration point to the REST API
- Authentication state is shared globally through `AuthContext` backed by `localStorage`
- Role-based UI forking: `admin`, `enduser`, `official` each have distinct subtrees under `src/routes/`

## Layers

**HTTP Handler Layer (backend):**
- Purpose: Receive HTTP requests, validate, query DB, return JSON
- Location: `backend/src/*/handlers.rs`
- Contains: Rocket handler functions (`#[get]`, `#[post]`, etc.)
- Depends on: `PgPool` state, `AuthGuard`, module models
- Used by: Rocket route registry in `shared/rocket_setup.rs`

**Domain Model Layer (backend):**
- Purpose: Serde-serializable structs mapping DB rows and request/response shapes
- Location: `backend/src/*/models.rs`
- Contains: `#[derive(sqlx::FromRow, Serialize, Deserialize)]` structs
- Depends on: `sqlx`, `serde`, `validator`
- Used by: Handlers in the same module

**Shared Utilities (backend):**
- Purpose: Cross-cutting infrastructure (pagination, response envelope, auth guard, RBAC, error type)
- Location: `backend/src/shared/`
- Contains: `response.rs`, `pagination.rs`, `error.rs`, `rbac.rs`, `rocket_setup.rs`, `handlers.rs`
- Depends on: `sqlx`, `rocket`
- Used by: All domain modules

**Route / Page Layer (frontend):**
- Purpose: Define URL segments and render page-level components
- Location: `frontend/src/routes/`
- Contains: TanStack Router `createFileRoute` exports; heavy components extracted to `_component.tsx` files and lazy-loaded
- Depends on: hooks, components, auth context
- Used by: TanStack Router (`routeTree.gen.ts`)

**Hook Layer (frontend):**
- Purpose: Encapsulate React Query calls to the REST API; define query key factories
- Location: `frontend/src/hooks/use-*.ts`
- Contains: `useQuery` and `useMutation` wrappers, cache invalidation logic
- Depends on: `src/lib/api.ts`, TypeScript types from `src/types/`
- Used by: Route/page components

**API Client (frontend):**
- Purpose: Low-level fetch wrapper with auth header injection and error normalisation
- Location: `frontend/src/lib/api.ts`
- Contains: `apiFetch<T>`, `ApiError` class, `api.{get,post,put,delete}` helpers
- Depends on: `localStorage` for JWT, `VITE_API_URL` env var
- Used by: Hook layer

**Context Layer (frontend):**
- Purpose: Global app state (auth, WebSocket connection)
- Location: `frontend/src/contexts/`
- Contains: `AuthContext` (login/logout/role), `WebSocketContext` (WS connection via `use-websocket` hook)
- Depends on: `api.ts`, `use-websocket.ts`
- Used by: Root route, `ProtectedRoute`, `Layout`, any page needing auth state

## Data Flow

### Primary API Request Path

1. User action triggers React Query mutation/query in a hook (`frontend/src/hooks/use-*.ts`)
2. Hook calls `api.get/post/put/delete` from `frontend/src/lib/api.ts`
3. `apiFetch` reads JWT from `localStorage`, attaches `Authorization: Bearer <token>` header, calls `fetch(VITE_API_URL + endpoint)`
4. Rocket receives request, runs `AuthGuard::from_request` (`backend/src/auth/middleware.rs`) to validate JWT
5. Rocket handler function executes, queries `PgPool` with inline `sqlx` SQL
6. Handler returns `Json<T>` or `Status` error code
7. `apiFetch` checks `response.ok`, parses JSON, throws `ApiError` on error
8. React Query caches result; component re-renders via `data` from `useQuery`

### Authentication Flow

1. User POSTs credentials to `/api/auth/login` (`backend/src/auth/handlers.rs`)
2. Backend looks up `person` row with matching `username` and non-null `password_hash`, verifies bcrypt
3. Backend creates JWT (8-hour expiry) with `sub=person_id`, `role=<role>` (`backend/src/auth/jwt.rs`)
4. Frontend `AuthContext.login()` stores token + user object in `localStorage` and React state
5. `getDefaultRoute(role)` determines the role-specific landing page; router navigates there

### WebSocket Flow

1. `WebSocketProvider` mounts at app root (`frontend/src/routes/__root.tsx`)
2. `useWebSocket` hook connects to `VITE_WS_URL` (default `ws://localhost:15540`) with JWT in URL/header
3. WebSocket server (`backend/src/messaging/handlers.rs`) runs on a separate Tokio task spawned at startup
4. Connection status exposed via `WebSocketContext` and shown in the nav `Layout` component

**State Management:**
- Server state: React Query cache (TTL 5 minutes, no refetch on window focus)
- Auth state: React context backed by `localStorage` (survives page refresh)
- UI state: Local `useState` within route/component files

## Key Abstractions

**`AuthGuard` request guard:**
- Purpose: Protect any Rocket handler from unauthenticated access
- Examples: Used in every handler that is not `login` — `_auth: AuthGuard` parameter
- Pattern: Rocket `FromRequest` trait; extracts and validates JWT from `Authorization` header

**`PaginatedResponse<T>`:**
- Purpose: Standard envelope for list endpoints
- Examples: `backend/src/shared/response.rs`
- Pattern: Generic struct `{ items, total, page, per_page, total_pages }` returned as `Json<PaginatedResponse<T>>`

**React Query key factories:**
- Purpose: Consistent cache key namespacing per domain entity
- Examples: `personKeys` in `frontend/src/hooks/use-person.ts`
- Pattern: `{ all, lists, list(page, perPage), details, detail(id) }` — invalidation uses parent key to clear all children

**`ProtectedRoute` wrapper:**
- Purpose: Declarative role guard in route tree
- Examples: `frontend/src/components/ProtectedRoute.tsx`
- Pattern: Wraps page component; redirects to login if unauthenticated, to role default route if wrong role

**Domain module structure (backend):**
- Purpose: Consistent organisation of each API domain
- Examples: `backend/src/person/`, `backend/src/roles/`, `backend/src/nda/`
- Pattern: Each module contains `mod.rs` (exports + `routes()` fn), `models.rs` (structs), `handlers.rs` (Rocket fns)

## Entry Points

**Backend binary:**
- Location: `backend/src/main.rs`
- Triggers: `cargo run` or Docker `CMD`
- Responsibilities: Calls `shared::rocket_setup::create_rocket().await`, which connects to DB, starts WS, mounts all routes

**Frontend SPA:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser load or `npm run dev`
- Responsibilities: Creates TanStack Router from generated `routeTree.gen.ts`, wraps in `QueryClientProvider`, renders `RouterProvider`

**Root Route (frontend):**
- Location: `frontend/src/routes/__root.tsx`
- Triggers: Every page render
- Responsibilities: Provides `AuthProvider` and `WebSocketProvider` to entire app tree

**Index Route (frontend):**
- Location: `frontend/src/routes/index.tsx`
- Triggers: Navigation to `/`
- Responsibilities: Reads auth state; redirects to `/login` or role-appropriate default route

## Architectural Constraints

- **Threading:** Rocket runs on Tokio async runtime. DB calls are async via `sqlx`. WebSocket server runs as a separate `tokio::spawn` task — shares the same `PgPool` clone.
- **Global state (backend):** `PgPool`, `String` (JWT secret), and `WebSocketManager` are registered as Rocket managed state singletons (`rocket.manage(...)`).
- **Global state (frontend):** `AuthContext` and `WebSocketContext` are module-level React contexts; auth data is mirrored to `localStorage`.
- **No service layer:** Handlers call `sqlx` directly — there is no repository or service abstraction between handler and database.
- **Dual `ProtectedRoute` implementations:** `frontend/src/components/ProtectedRoute.tsx` (PascalCase, role-aware) and `frontend/src/components/protected-route.tsx` (kebab-case, auth-only) coexist with different APIs — callers must use the correct one.
- **Route tree is generated:** `frontend/src/routeTree.gen.ts` is auto-generated by TanStack Router plugin — never edit manually.
- **`App.tsx` is unused:** `frontend/src/App.tsx` is a leftover Vite scaffold file; the actual app entry is `main.tsx` + `__root.tsx`.

## Anti-Patterns

### Two `ProtectedRoute` components with different contracts

**What happens:** `ProtectedRoute.tsx` accepts `allowedRoles: string[]` and redirects wrong-role users; `protected-route.tsx` only checks `isAuthenticated` with no role param.
**Why it's wrong:** Callers importing from the wrong path get no role enforcement silently, creating potential unauthorised access to role-gated pages.
**Do this instead:** Use `frontend/src/components/ProtectedRoute.tsx` (PascalCase, capital P) exclusively and pass `allowedRoles`. The lowercase file should be removed or merged.

### Dynamic query building with string concatenation

**What happens:** `update_person` in `backend/src/person/handlers.rs` builds a `UPDATE` SQL string by appending `format!` fragments per optional field, maintaining a manual `param_count`.
**Why it's wrong:** Error-prone — parameter numbering mismatches produce runtime panics; impossible to test statically with `sqlx::query!` macros.
**Do this instead:** Use `sqlx::QueryBuilder` or replace optional fields with explicit `COALESCE($n, column)` patterns to keep queries static.

## Error Handling

**Strategy:** Handlers return `Result<Json<T>, Status>` — errors map to HTTP status codes directly. An `AppError` enum in `backend/src/shared/error.rs` implements `Responder`, but most handlers bypass it and use `Status` directly.

**Patterns:**
- DB errors: `.map_err(|_| Status::InternalServerError)` — error detail is swallowed (not logged)
- Not-found: `.ok_or(Status::NotFound)` after `fetch_optional`
- Frontend: `ApiError` class (subclass of `Error`) carries `status: number`; React Query surfaces errors as `error` in hook return value

## Cross-Cutting Concerns

**Logging:** `eprintln!` in error paths only (e.g., `person/handlers.rs`); no structured logging framework. RUST_LOG env var is set but no `tracing` or `log` crate is used in handlers.
**Validation:** `validator` crate on request structs (`#[derive(Validate)]`); called at handler entry with `.validate().map_err(|_| Status::BadRequest)`.
**Authentication:** JWT via `jsonwebtoken` crate; 8-hour expiry; role embedded in token claims. Frontend reads from `localStorage`; backend validates per-request via `AuthGuard`.

---

*Architecture analysis: 2026-05-20*
