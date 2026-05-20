<!-- GSD:project-start source:PROJECT.md -->
## Project

**Janus 2.0**

Janus 2.0 is a security clearance and access-management system for tracking personnel, organizations, information systems, NDAs, and three-tier access grants (computer, data, physical) with audit logging and role-based dashboards. It is an internal admin tool: a Rust/Rocket REST API backed by PostgreSQL, with a React + TanStack SPA front end.

**Core Value:** Authorized staff can manage people, organizations, and their access grants through one role-aware UI without the data ever being exposed to or mutated by an unauthorized user.

### Constraints

- **Tech stack**: Rust 1.87 + Rocket 0.5 + sqlx/PostgreSQL (backend); React 19 + TanStack Router/Query + Vite + shadcn/ui (frontend) — match existing patterns, do not introduce new frameworks.
- **Routing**: TanStack file-based router; `routeTree.gen.ts` is generated — must be regenerated (not hand-edited) after route changes, and new route dirs committed before regen.
- **Ports**: frontend 15510, backend 15520, postgres 15530, WebSocket 15540 (dev).
- **Testing**: Vitest (unit, jsdom) + Playwright (e2e, must be excluded from the Vitest run).
- **Security**: do not regress the role-aware UI guards while consolidating; the PascalCase `ProtectedRoute` with `allowedRoles` is the canonical one.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Rust (edition 2021) - Backend API server (`backend/src/`)
- TypeScript ~5.9.3 - Frontend SPA (`frontend/src/`)
- SQL - Database migrations (`backend/migrations/`)
- Nginx config - Production frontend serving (`frontend/nginx.conf`)
## Runtime
- Rust 1.87 (minimum, per Dockerfile `FROM rust:1.87-slim`)
- Async runtime: Tokio 1.x (`backend/Cargo.toml`)
- Node.js 20 (per Dockerfile `FROM node:20-alpine`)
- No `.nvmrc` or `.node-version` file present — Node version enforced only via Docker
## Package Manager
- npm with `package-lock.json` (lockfile v3, `frontend/package-lock.json`)
- Lockfile: present
- Cargo with `Cargo.lock` (`backend/Cargo.lock`)
- Lockfile: present
## Frameworks
- Rocket 0.5 (features: json) - HTTP web framework (`backend/Cargo.toml`)
- rocket_cors 0.6 - CORS middleware
- React 19.1.1 - UI library (`frontend/package.json`)
- TanStack Router 1.133.x - Type-safe file-based routing (`frontend/src/routes/`)
- TanStack Query 5.90.x - Server state management / data fetching
- shadcn/ui (new-york style) - Component library built on Radix UI (`frontend/src/components/ui/`)
- Radix UI primitives - `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-icons`
- Tailwind CSS 3.4.x - Utility-first styling with CSS variables (`frontend/tailwind.config.js`)
- lucide-react 0.548 - Icon set
- class-variance-authority + clsx + tailwind-merge - Component variant utilities
- react-hook-form 7.65 - Form state management
- zod 4.1.12 - Schema validation
- @hookform/resolvers 5.2 - Bridge between react-hook-form and zod
- Vitest 4.0.x - Unit/component test runner (`frontend/vite.config.ts` test config)
- @testing-library/react 16.x - React component testing
- @testing-library/jest-dom 6.x - DOM matchers
- jsdom 28.x - DOM environment for tests
- Playwright 1.56.x - E2E testing (`frontend/playwright.config.ts`)
- Vite 7.1.7 - Dev server and bundler (`frontend/vite.config.ts`)
- @vitejs/plugin-react 5.0 - React Fast Refresh support
- @tanstack/router-vite-plugin - Auto-generates route tree from `src/routes/` filesystem
## Key Dependencies
- sqlx 0.7 (features: runtime-tokio-native-tls, postgres, uuid, chrono, json) - Async PostgreSQL client (`backend/Cargo.toml`)
- jsonwebtoken 9.2 - JWT creation and validation (`backend/src/auth/jwt.rs`)
- bcrypt 0.15 - Password hashing (`backend/src/auth/handlers.rs`, `backend/src/person/handlers.rs`)
- validator 0.16 - Request body validation
- serde + serde_json 1.0 - JSON serialization
- s3-tokio 0.39 (aliased as `s3`) - MinIO/S3 object storage client (`backend/Cargo.toml`)
- tokio-tungstenite 0.21 - WebSocket server implementation (`backend/src/messaging/`)
- uuid 1.5 (v4) - UUID generation
- chrono 0.4 - Date/time types
- dotenvy 0.15 - `.env` file loading
- base64 0.22 - File attachment encoding/decoding
- @tanstack/react-router - File-based routing with auto-generated tree (`frontend/src/routeTree.gen.ts`)
- @tanstack/react-query - Data fetching and cache (`frontend/src/hooks/`)
- @tanstack/react-router-devtools - DevTools overlay in development
- log 0.4 + env_logger 0.11 - Logging facade and implementation
- futures-util 0.3 - Async stream utilities for WebSocket
## Configuration
- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - HMAC secret for JWT signing, min 32 chars (required)
- `ROCKET_PORT` - HTTP port override (default: 8000)
- `ROCKET_ADDRESS` - Bind address (default: 0.0.0.0 in Docker)
- `RUST_LOG` - Log level filter (e.g., `info`)
- `MINIO_ENDPOINT` - Object storage URL (default: `http://localhost:9000`)
- `MINIO_ACCESS_KEY` - Object storage access key
- `MINIO_SECRET_KEY` - Object storage secret key
- `MINIO_BUCKET` - Bucket name (default: `janus-documents`)
- `MINIO_REGION` - S3 region string (default: `us-east-1`)
- Loaded via `dotenvy` from `.env` at startup (`backend/src/shared/rocket_setup.rs`)
- `.env` file present at `backend/.env` — contents not read
- `VITE_API_URL` - Backend HTTP base URL (default: `http://localhost:15520`)
- `VITE_WS_URL` - WebSocket URL (default: `ws://localhost:15540`)
- Set at build time or via Docker environment
- `frontend/vite.config.ts` - Vite config with path alias `@` → `./src`
- `frontend/tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` - TypeScript project references
- `frontend/tailwind.config.js` - Tailwind with shadcn/ui CSS variable tokens
- `frontend/postcss.config.js` - PostCSS with autoprefixer
- `frontend/eslint.config.js` - ESLint 9 flat config with typescript-eslint + react-hooks + react-refresh
- `backend/Cargo.toml` - Release profile: `opt-level=3`, `lto=true`, `codegen-units=1`
## Platform Requirements
- Docker + Docker Compose for PostgreSQL (`docker-compose.dev.yml` — DB only)
- Native Rust toolchain for backend dev
- Node 20 + npm for frontend dev
- Backend dev server: `localhost:15520` (HTTP), `localhost:15540` (WebSocket)
- Frontend dev server: `localhost:15510`
- PostgreSQL: `localhost:15530`
- Docker Compose full profile (`docker-compose.yml` with `--profile full`)
- PostgreSQL 15 Alpine container
- Backend: Rocket in Debian slim container
- Frontend: nginx Alpine serving Vite-built static files on port 3000
- Ports: 15510 (frontend), 15520 (backend API), 15530 (postgres), 15540 (WebSocket)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Route files: `kebab-case.tsx` — e.g., `info-systems.tsx`, `dashboard.tsx`
- Route component implementations: `_component.tsx` (underscore prefix) — placed alongside the route file in the same directory
- Hook files: `use-kebab-case.ts` — e.g., `use-person.ts`, `use-websocket.ts`
- Type files: `kebab-case.ts` — e.g., `person.ts`, `info-system.ts`
- Context files: `kebab-case-context.tsx` — e.g., `auth-context.tsx`
- UI component files: `kebab-case.tsx` — e.g., `button.tsx`, `dropdown-menu.tsx`
- Module directories: `snake_case` — e.g., `info_systems/`, `document_references/`
- Source files: `snake_case.rs` — e.g., `handlers.rs`, `models.rs`, `mod.rs`
- Test files: `snake_case_test.rs` — e.g., `info_systems_test.rs`, `nda_test.rs`
- React components: `PascalCase` — e.g., `PersonListPage`, `ClearanceBadge`
- Hooks: `camelCase` with `use` prefix — e.g., `usePersonList`, `useCreatePerson`
- Regular functions: `camelCase` — e.g., `loginAsRole`, `getDefaultRoute`
- Event handlers: `on` prefix — e.g., `onSave`, `onDelete`, `onCreate`
- Handler functions: `snake_case` — e.g., `list_persons`, `get_info_system`, `create_person`
- Helper functions: `snake_case` — e.g., `validate_environment`, `validate_status`, `auth_header`
- Validation helpers: descriptive `snake_case` — e.g., `validate_environment`, `get_auth_token`
- All variables: `camelCase`
- Constants/query keys: `camelCase` with descriptive suffix — e.g., `personKeys`, `adminNavItems`
- TypeScript types: `PascalCase` — e.g., `NavItem`, `AuthContextType`, `MockWebSocket`
- TypeScript interfaces: `PascalCase` — e.g., `Person`, `CreatePersonRequest`
- Type aliases: `PascalCase` — e.g., `ClearanceLevel`
- All variables: `snake_case`
- Types/structs: `PascalCase` — e.g., `InfoSystem`, `CreateInfoSystemRequest`, `AuthGuard`
- String enums stored as `SCREAMING_SNAKE_CASE` in database — e.g., `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `TOP_SECRET`
- Validated via custom validator functions on model structs
## Code Style
- No `.prettierrc` — relies on ESLint for formatting enforcement
- Single quotes for string literals throughout TypeScript/TSX
- Trailing commas in multi-line structures (enforced by TypeScript ESLint)
- `ES2022` target, `strict` mode enabled
- Tool: ESLint 9 with `eslint.config.js` (flat config)
- Extends: `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs['recommended-latest']`, `reactRefresh.configs.vite`
- TypeScript strict: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`
- No custom rule overrides beyond default plugin recommendations
- Rust standard `rustfmt` formatting (implicit via Cargo)
- All raw SQL queries use raw string literals `r#"..."#` for multi-line clarity
- Module-level comment headers: `// Module name - purpose` at top of each file
## Import Organization
- `@/*` maps to `./src/*` — configured in both `tsconfig.app.json` and `vite.config.ts`
- Use `@/` prefix for all internal imports; never use relative paths like `../../`
- Rocket macros and types first: `use rocket::{State, get, post, ...}`
- SQLx: `use sqlx::PgPool`
- Internal crate modules: `use super::models::*`, `use crate::auth::middleware::AuthGuard`
## Error Handling
- Custom `ApiError` class defined in `src/lib/api.ts` with `status: number` and `data?: any`
- All API calls propagate `ApiError` upward; components catch and render inline error UI
- Error display pattern: `<div className="bg-destructive/10 text-destructive p-4 rounded-md">Error: {err.message}</div>`
- No toast notifications — errors are rendered inline in the component
- Use `mutateAsync` (throws on error) rather than `mutate` in event handlers
- Mutations wrapped in try/catch at the handler level where error feedback is needed
- Pending state tracked via `mutation.isPending` to disable buttons
- All handlers return `Result<Json<T>, Status>` — never panic
- Validation errors: `request.validate().map_err(|_| Status::BadRequest)?`
- Database errors: `.map_err(|_| Status::InternalServerError)?`
- Not found: `.ok_or(Status::NotFound)?` on `fetch_optional`
- Debug logging to stderr on DB errors: `eprintln!("Database error: {:?}", e)` (inconsistently applied)
- Use `validator` crate with `#[derive(Validate)]` on request structs
- Custom validators written as `fn validate_x(val: &str) -> Result<(), validator::ValidationError>`
- Validated at start of each handler: `person_request.validate().map_err(|_| Status::BadRequest)?`
## Logging
- `env_logger` and `log` crates are declared as dependencies but not consistently used
- Actual logging: `println!` for startup messages, `eprintln!` for database errors in handlers
- Pattern is ad hoc — not all handlers log errors
## Comments
- JSDoc on exported utility functions: `/** Get the default route for a user role after login */`
- JSDoc with `@example` blocks on component props interfaces
- Inline comments explaining non-obvious logic — e.g., `// Use person_id from response`
- Comment out `.bak` files for deprecated route variants (e.g., `$personnelId.tsx.bak`)
- Module-level comment header on every file: `// Module name - purpose`
- Inline comments for multi-step logic — e.g., `// Soft delete by setting deleted_at timestamp`
- `// TODO:` for known gaps (see CONCERNS.md)
## Function Design
## Module Design
- Named exports for all hooks, components, and utilities — no default exports except for route `_component.tsx` files (which use `export default function`)
- Route files export a single `Route` constant: `export const Route = createFileRoute('/path')({...})`
- No barrel `index.ts` files — imports reference specific files directly
- Each domain has a directory (`person/`, `info_systems/`, etc.) with exactly three files: `mod.rs`, `models.rs`, `handlers.rs`
- `mod.rs` defines the module's `routes()` function returning a `Vec<Route>` and re-exports needed items
- `lib.rs` declares all top-level modules and exports `crate::` paths used by integration tests
## React Patterns
- `src/components/protected-route.tsx` — simple auth check only, no role enforcement
- `src/components/ProtectedRoute.tsx` — role-based guard with `allowedRoles: string[]` prop
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Backend modules are flat domain modules (`person`, `roles`, etc.), each with `models.rs` + `handlers.rs` + `mod.rs`
- No service layer between handlers and database; handlers query `PgPool` directly via inline `sqlx` SQL
- Frontend uses file-system routing (TanStack Router) with auto-generated `routeTree.gen.ts`; route segments map to directory structure under `src/routes/`
- Data fetching is entirely React Query-based; hooks in `src/hooks/` are the single integration point to the REST API
- Authentication state is shared globally through `AuthContext` backed by `localStorage`
- Role-based UI forking: `admin`, `enduser`, `official` each have distinct subtrees under `src/routes/`
## Layers
- Purpose: Receive HTTP requests, validate, query DB, return JSON
- Location: `backend/src/*/handlers.rs`
- Contains: Rocket handler functions (`#[get]`, `#[post]`, etc.)
- Depends on: `PgPool` state, `AuthGuard`, module models
- Used by: Rocket route registry in `shared/rocket_setup.rs`
- Purpose: Serde-serializable structs mapping DB rows and request/response shapes
- Location: `backend/src/*/models.rs`
- Contains: `#[derive(sqlx::FromRow, Serialize, Deserialize)]` structs
- Depends on: `sqlx`, `serde`, `validator`
- Used by: Handlers in the same module
- Purpose: Cross-cutting infrastructure (pagination, response envelope, auth guard, RBAC, error type)
- Location: `backend/src/shared/`
- Contains: `response.rs`, `pagination.rs`, `error.rs`, `rbac.rs`, `rocket_setup.rs`, `handlers.rs`
- Depends on: `sqlx`, `rocket`
- Used by: All domain modules
- Purpose: Define URL segments and render page-level components
- Location: `frontend/src/routes/`
- Contains: TanStack Router `createFileRoute` exports; heavy components extracted to `_component.tsx` files and lazy-loaded
- Depends on: hooks, components, auth context
- Used by: TanStack Router (`routeTree.gen.ts`)
- Purpose: Encapsulate React Query calls to the REST API; define query key factories
- Location: `frontend/src/hooks/use-*.ts`
- Contains: `useQuery` and `useMutation` wrappers, cache invalidation logic
- Depends on: `src/lib/api.ts`, TypeScript types from `src/types/`
- Used by: Route/page components
- Purpose: Low-level fetch wrapper with auth header injection and error normalisation
- Location: `frontend/src/lib/api.ts`
- Contains: `apiFetch<T>`, `ApiError` class, `api.{get,post,put,delete}` helpers
- Depends on: `localStorage` for JWT, `VITE_API_URL` env var
- Used by: Hook layer
- Purpose: Global app state (auth, WebSocket connection)
- Location: `frontend/src/contexts/`
- Contains: `AuthContext` (login/logout/role), `WebSocketContext` (WS connection via `use-websocket` hook)
- Depends on: `api.ts`, `use-websocket.ts`
- Used by: Root route, `ProtectedRoute`, `Layout`, any page needing auth state
## Data Flow
### Primary API Request Path
### Authentication Flow
### WebSocket Flow
- Server state: React Query cache (TTL 5 minutes, no refetch on window focus)
- Auth state: React context backed by `localStorage` (survives page refresh)
- UI state: Local `useState` within route/component files
## Key Abstractions
- Purpose: Protect any Rocket handler from unauthenticated access
- Examples: Used in every handler that is not `login` — `_auth: AuthGuard` parameter
- Pattern: Rocket `FromRequest` trait; extracts and validates JWT from `Authorization` header
- Purpose: Standard envelope for list endpoints
- Examples: `backend/src/shared/response.rs`
- Pattern: Generic struct `{ items, total, page, per_page, total_pages }` returned as `Json<PaginatedResponse<T>>`
- Purpose: Consistent cache key namespacing per domain entity
- Examples: `personKeys` in `frontend/src/hooks/use-person.ts`
- Pattern: `{ all, lists, list(page, perPage), details, detail(id) }` — invalidation uses parent key to clear all children
- Purpose: Declarative role guard in route tree
- Examples: `frontend/src/components/ProtectedRoute.tsx`
- Pattern: Wraps page component; redirects to login if unauthenticated, to role default route if wrong role
- Purpose: Consistent organisation of each API domain
- Examples: `backend/src/person/`, `backend/src/roles/`, `backend/src/nda/`
- Pattern: Each module contains `mod.rs` (exports + `routes()` fn), `models.rs` (structs), `handlers.rs` (Rocket fns)
## Entry Points
- Location: `backend/src/main.rs`
- Triggers: `cargo run` or Docker `CMD`
- Responsibilities: Calls `shared::rocket_setup::create_rocket().await`, which connects to DB, starts WS, mounts all routes
- Location: `frontend/src/main.tsx`
- Triggers: Browser load or `npm run dev`
- Responsibilities: Creates TanStack Router from generated `routeTree.gen.ts`, wraps in `QueryClientProvider`, renders `RouterProvider`
- Location: `frontend/src/routes/__root.tsx`
- Triggers: Every page render
- Responsibilities: Provides `AuthProvider` and `WebSocketProvider` to entire app tree
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
### Dynamic query building with string concatenation
## Error Handling
- DB errors: `.map_err(|_| Status::InternalServerError)` — error detail is swallowed (not logged)
- Not-found: `.ok_or(Status::NotFound)` after `fetch_optional`
- Frontend: `ApiError` class (subclass of `Error`) carries `status: number`; React Query surfaces errors as `error` in hook return value
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
