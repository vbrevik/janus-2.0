<!-- refreshed: 2026-06-23 -->
# Architecture

**Analysis Date:** 2026-06-23

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    React 19 SPA (frontend)                   │
├──────────────────┬──────────────────┬───────────────────────┤
│  TanStack Routes │  React Query     │   Contexts            │
│  `src/routes/`   │  hooks           │   (Auth / WebSocket)  │
│  (admin/enduser/ │  `src/hooks/     │   `src/contexts/`     │
│   official)      │   use-*.ts`      │                       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │ apiFetch (`src/lib/api.ts`, Bearer JWT)│ WS :15540
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Rust + Rocket 0.5 REST API (backend)            │
│  `shared::rocket_setup::create_rocket()` mounts domains      │
│  AuthGuard (Bearer-JWT) on every non-login handler           │
│  Domain modules: handlers.rs query PgPool inline (no service)│
└─────────────────────────────────────────────────────────────┘
         │ sqlx (raw SQL)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL :15530   (migrations in `backend/migrations/`)   │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Rocket bootstrap | Connect DB pool, mount routes, configure CORS, spawn WS server | `backend/src/shared/rocket_setup.rs` |
| Domain module | One bounded context: `mod.rs` (exports + `routes()`), `models.rs`, `handlers.rs` | `backend/src/person/` (template) |
| AuthGuard | Bearer-JWT request guard on protected handlers | `backend/src/auth/middleware.rs` |
| Shared infra | `PaginatedResponse<T>`, `ApiResponse<T>`, pagination, error, rbac | `backend/src/shared/` |
| WebSocket manager | Real-time messaging on :15540 | `backend/src/messaging/` |
| Router bootstrap | Mount generated route tree under React Query + StrictMode | `frontend/src/main.tsx` |
| Data layer | `apiFetch`, `ApiError{status}`, auth-header injection | `frontend/src/lib/api.ts` |
| Query hooks | React Query wrappers per domain | `frontend/src/hooks/use-*.ts` |
| Global state | JWT in localStorage + WS connection | `frontend/src/contexts/auth-context.tsx`, `websocket-context.tsx` |

## Pattern Overview

**Overall:** Layered client-server. Rust REST API with a flat domain-module backend (no service layer — handlers query the DB directly); React SPA with file-based routing and a React Query data layer.

**Key Characteristics:**
- Backend domains are self-contained 3-file modules (`mod.rs`/`models.rs`/`handlers.rs`); cross-cutting concerns live only in `shared/`.
- Handlers return `Result<Json<T>, Status>` and never panic — errors map to HTTP status codes inline.
- Frontend is role-aware: parallel route subtrees (`admin/`, `enduser/`, `official/`) gated by `ProtectedRoute` with `allowedRoles`.

## Layers

**Frontend routes (presentation):**
- Purpose: File-based pages; heavy page logic in co-located `_component.tsx`.
- Location: `frontend/src/routes/` (subtrees `admin/`, `enduser/`, `official/`).
- Depends on: query hooks, contexts, UI components.
- Used by: TanStack router (`routeTree.gen.ts` — generated, never hand-edit).

**Frontend data layer:**
- Purpose: Server-state fetching/caching.
- Location: `frontend/src/hooks/use-*.ts` → `frontend/src/lib/api.ts`.
- Depends on: `apiFetch` (injects Bearer token, throws `ApiError{status}`).

**Backend domain layer:**
- Purpose: Per-domain HTTP handlers + sqlx models.
- Location: `backend/src/<domain>/`.
- Depends on: `PgPool` (managed state), `shared/`, `auth::middleware::AuthGuard`.

**Backend shared infra:**
- Purpose: Cross-cutting setup and response envelopes.
- Location: `backend/src/shared/`.
- Used by: all domain modules and `main.rs`.

## Data Flow

### Primary Request Path

1. UI calls a query hook, e.g. `useQuery` in `frontend/src/hooks/use-person.ts`.
2. Hook calls `apiFetch('/api/person')` which injects the Bearer JWT (`frontend/src/lib/api.ts`).
3. Rocket routes to the mounted handler `person::handlers::list_persons` (`backend/src/shared/rocket_setup.rs:109`).
4. `AuthGuard` validates the JWT (`backend/src/auth/middleware.rs`).
5. Handler runs inline `sqlx` against `PgPool` and returns `Json<PaginatedResponse<Person>>` (`backend/src/person/handlers.rs`).
6. Hook caches the response; React Query staleTime is 5 min (`frontend/src/main.tsx`).

### Real-time Messaging Flow

1. Rocket bootstrap spawns a separate WebSocket server on :15540 (`rocket_setup.rs:40`).
2. Frontend connects via `WebSocketContext` (`frontend/src/contexts/websocket-context.tsx`, hook `use-websocket.ts`).
3. WS server validates JWT and routes messages via `WebSocketManager` (`backend/src/messaging/`).

**State Management:**
- Server state: React Query cache.
- Auth/session: `AuthContext` with JWT in `localStorage`; redirect-by-role via `getDefaultRoute` (`frontend/src/contexts/auth-context.tsx`).

## Key Abstractions

**Domain module (backend):**
- Purpose: One bounded context.
- Examples: `backend/src/person/`, `backend/src/access/`, `backend/src/nda/`.
- Pattern: `mod.rs` exposes `routes() -> Vec<rocket::Route>` + re-exports models.

**Response envelope:**
- Purpose: Consistent list/single payloads.
- Examples: `PaginatedResponse<T>` = `{items,total,page,per_page,total_pages}`, `ApiResponse<T>` (`backend/src/shared/response.rs`).

**Query hook (frontend):**
- Purpose: Encapsulate one domain's server-state access.
- Examples: `frontend/src/hooks/use-access.ts`, `use-relations.ts`.

## Entry Points

**Backend:**
- Location: `backend/src/main.rs` → `shared::rocket_setup::create_rocket()`.
- Triggers: `cargo run`.
- Responsibilities: Build pool, mount routes, spawn WS, launch Rocket on :15520 (container default 8000, overridable via `ROCKET_PORT`).

**Frontend:**
- Location: `frontend/src/main.tsx` → `RouterProvider` under `QueryClientProvider`.
- Triggers: Vite dev server on :15510.
- `routes/index.tsx` redirects `/` by role; `routes/__root.tsx` provides `AuthContext`/`WebSocketContext` and `Layout` chrome.

## Architectural Constraints

- **No service layer (backend):** Handlers query `PgPool` directly via inline `sqlx`. Do not introduce a service/repository layer.
- **Generated routing:** `frontend/src/routeTree.gen.ts` is generated — never hand-edit; regenerate after route changes and commit new route dirs first.
- **Threading:** Rocket async runtime (tokio); the WS server is spawned as a separate `tokio::spawn` task on :15540.
- **Global state:** `db_pool`, `jwt_secret`, and `WebSocketManager` are Rocket-managed singletons (`rocket_setup.rs:81-83`).
- **No new frameworks:** Match the existing stack (Rocket/sqlx; TanStack/shadcn).

## Anti-Patterns

### Hardcoding `/api/...` inside route macros for mounted modules

**What happens:** A handler in a module mounted at `/api/person` also writes `#[get("/api/person/<id>")]`.
**Why it's wrong:** Double-prefixes the URL — the route never matches.
**Do this instead:** Use RELATIVE handler paths (`#[get("/<id>")]`); the mount point supplies `/api/<x>` (see `backend/src/person/mod.rs` + `rocket_setup.rs:109`).

### Omitting the `/api` prefix on the frontend

**What happens:** Calling `apiFetch('/person')`.
**Why it's wrong:** `src/lib/api.ts` base is the host WITHOUT `/api`, so the call 404s silently.
**Do this instead:** Every endpoint string must start with `/api/...` (e.g. `/api/person`).

### Reviving deprecated flat routes

**What happens:** Editing `frontend/src/routes/{access,roles,ndas,organizations,...}`.
**Why it's wrong:** These are unlinked pre-pivot duplicates that still carry known bugs.
**Do this instead:** Work in the `/admin/*` (and `enduser/`, `official/`) subtrees.

### Empty `<SelectItem value="">`

**What happens:** Radix throws; the root error boundary renders a blank "Something went wrong".
**Do this instead:** Use a sentinel (`value="ALL"`) treated as "no filter".

## Error Handling

**Strategy:** Backend handlers return `Result<Json<T>, Status>` and never panic.

**Patterns:**
- `validate().map_err(|_| Status::BadRequest)?`
- `.map_err(|_| Status::InternalServerError)?`
- `.ok_or(Status::NotFound)?`
- Frontend: `ApiError{status}` propagates; rendered inline (`bg-destructive/10 text-destructive`), no toasts.

## Cross-Cutting Concerns

**Logging:** Backend `RUST_LOG` (tracing); frontend console.
**Validation:** Backend `validate()` on request structs → `Status::BadRequest`.
**Authentication:** `AuthGuard` Bearer-JWT request guard on every non-login handler (`backend/src/auth/middleware.rs`); RBAC helpers in `backend/src/shared/rbac.rs`.

---

*Architecture analysis: 2026-06-23*
