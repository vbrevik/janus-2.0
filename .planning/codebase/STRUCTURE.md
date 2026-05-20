# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```
janus-2.0/
├── backend/                   # Rust/Rocket REST API + WebSocket server
│   ├── src/
│   │   ├── main.rs            # Binary entry point
│   │   ├── lib.rs             # Library crate (for integration tests)
│   │   ├── shared/            # Cross-cutting infrastructure
│   │   │   ├── rocket_setup.rs   # App assembly, route mounting
│   │   │   ├── response.rs       # ApiResponse<T>, PaginatedResponse<T>
│   │   │   ├── pagination.rs     # PaginationParams
│   │   │   ├── error.rs          # AppError enum + Responder impl
│   │   │   ├── rbac.rs           # role_has_permission() DB check
│   │   │   ├── handlers.rs       # /api/stats endpoint
│   │   │   ├── database.rs       # DB helpers (if any)
│   │   │   └── mod.rs
│   │   ├── auth/              # JWT auth, login, password change
│   │   │   ├── jwt.rs            # create_jwt / validate_jwt
│   │   │   ├── middleware.rs     # AuthGuard FromRequest impl
│   │   │   ├── models.rs         # LoginRequest, LoginResponse, Claims
│   │   │   ├── handlers.rs       # /api/auth/* endpoints
│   │   │   └── mod.rs
│   │   ├── person/            # Unified person/user entity
│   │   ├── organizations/     # Organization/department management
│   │   ├── roles/             # Role + permission management
│   │   ├── nda/               # NDA lifecycle
│   │   ├── discussions/       # Threaded discussions
│   │   ├── relations/         # Person/vendor relations
│   │   ├── access/            # Computer/data/physical access
│   │   ├── audit/             # Audit log read-out + middleware
│   │   ├── info_systems/      # Information systems CRUD
│   │   ├── vendor_relations/  # Vendor hierarchy
│   │   ├── document_references/
│   │   └── messaging/         # WebSocket server (port 15540)
│   │       ├── websocket.rs      # WebSocketManager
│   │       ├── handlers.rs       # start_websocket_server()
│   │       ├── models.rs
│   │       └── mod.rs
│   ├── tests/                 # Rust integration tests
│   │   ├── info_systems_test.rs
│   │   └── nda_test.rs
│   ├── migrations/            # sqlx migration SQL files (timestamped)
│   └── .sqlx/                 # sqlx offline query cache
│
├── frontend/                  # React + Vite + TanStack Router SPA
│   ├── src/
│   │   ├── main.tsx           # SPA entry — router + QueryClient setup
│   │   ├── routeTree.gen.ts   # AUTO-GENERATED — do not edit
│   │   ├── routes/            # File-system route definitions
│   │   │   ├── __root.tsx     # Root layout — AuthProvider + WebSocketProvider
│   │   │   ├── index.tsx      # / redirect based on auth/role
│   │   │   ├── login.tsx      # /login page
│   │   │   ├── dashboard.tsx
│   │   │   ├── admin/         # Admin-role routes
│   │   │   │   ├── dashboard.tsx        # lazy-loads dashboard/_component.tsx
│   │   │   │   ├── dashboard/_component.tsx
│   │   │   │   ├── person/
│   │   │   │   │   ├── index.tsx        # lazy-loads _component.tsx
│   │   │   │   │   ├── _component.tsx   # person list page implementation
│   │   │   │   │   └── $personId.tsx    # person detail page
│   │   │   │   ├── organizations/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   └── $vendorId.tsx
│   │   │   │   ├── roles/index.tsx
│   │   │   │   ├── nda/index.tsx (ndas/)
│   │   │   │   ├── discussions/index.tsx
│   │   │   │   ├── access/index.tsx
│   │   │   │   ├── audit/index.tsx
│   │   │   │   ├── info-systems.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── enduser/       # End-user-role routes
│   │   │   │   ├── tasks.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── official/      # Official-role routes
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── personnel.tsx
│   │   │   │   ├── vendors.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── person/        # Shared/non-admin person routes
│   │   │   │   ├── index.tsx
│   │   │   │   └── $personId.tsx
│   │   │   ├── organizations/
│   │   │   ├── roles/
│   │   │   ├── ndas/
│   │   │   ├── access/
│   │   │   ├── audit/
│   │   │   ├── person-relations/
│   │   │   └── info-systems.tsx
│   │   ├── components/
│   │   │   ├── layout.tsx           # App shell: header, role-based nav, WS status
│   │   │   ├── ProtectedRoute.tsx   # Role-aware auth guard (preferred)
│   │   │   ├── protected-route.tsx  # Auth-only guard (legacy, avoid)
│   │   │   ├── person-details/      # Person detail sub-components
│   │   │   └── ui/                  # shadcn/ui primitives
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── table.tsx
│   │   │       ├── input.tsx
│   │   │       ├── select.tsx
│   │   │       ├── badge.tsx
│   │   │       ├── checkbox.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── dropdown-menu.tsx
│   │   │       └── label.tsx
│   │   ├── contexts/
│   │   │   ├── auth-context.tsx     # AuthContext, AuthProvider, useAuth, getDefaultRoute
│   │   │   └── websocket-context.tsx
│   │   ├── hooks/                   # React Query wrappers (one file per domain)
│   │   │   ├── use-person.ts
│   │   │   ├── use-organizations.ts
│   │   │   ├── use-roles.ts
│   │   │   ├── use-nda.ts
│   │   │   ├── use-discussions.ts
│   │   │   ├── use-access.ts
│   │   │   ├── use-audit.ts
│   │   │   ├── use-info-systems.ts
│   │   │   ├── use-relations.ts
│   │   │   ├── use-vendor-relations.ts
│   │   │   ├── use-document-references.ts
│   │   │   └── use-websocket.ts
│   │   ├── lib/
│   │   │   ├── api.ts               # apiFetch<T>, ApiError, api.{get,post,put,delete}
│   │   │   └── utils.ts             # Tailwind class utilities (cn)
│   │   └── types/                   # TypeScript interfaces per domain
│   │       ├── person.ts
│   │       ├── organization.ts
│   │       ├── roles.ts
│   │       ├── nda.ts
│   │       ├── discussion.ts
│   │       ├── access.ts
│   │       ├── audit.ts
│   │       ├── info-system.ts
│   │       ├── relation.ts
│   │       ├── vendor-relation.ts
│   │       ├── document-reference.ts
│   │       ├── websocket.ts
│   │       ├── api.ts
│   │       └── personnel.ts.bak     # Leftover backup — not imported
│   ├── e2e/                   # Playwright E2E test specs
│   └── public/                # Static assets
│
├── docs/                      # Feature documentation
│   └── features/
│       └── info-systems/
├── scripts/                   # Ad-hoc helper scripts
├── docker-compose.yml         # Production-like stack (postgres + backend + frontend)
├── docker-compose.dev.yml     # Dev override
└── .planning/                 # GSD planning documents
    └── codebase/
```

## Directory Purposes

**`backend/src/shared/`:**
- Purpose: Cross-cutting infrastructure shared by all domain modules
- Contains: App assembly (`rocket_setup.rs`), response types, pagination, error type, RBAC helper
- Key files: `rocket_setup.rs`, `response.rs`, `pagination.rs`, `rbac.rs`, `error.rs`

**`backend/src/<domain>/`:**
- Purpose: One directory per API domain; self-contained with models + handlers
- Contains: `mod.rs` (exports + `routes()` fn), `models.rs`, `handlers.rs`, optionally `middleware.rs`
- Key files: `mod.rs` is the public face; `handlers.rs` contains Rocket route functions

**`backend/migrations/`:**
- Purpose: sqlx migration SQL files applied in timestamp order
- Contains: `YYYYMMDDHHMMSS_description.sql` files
- Generated: No — written manually; run via `sqlx migrate run`

**`frontend/src/routes/`:**
- Purpose: File-system route definitions consumed by TanStack Router codegen
- Contains: `createFileRoute(...)` exports; heavy implementations extracted to `_component.tsx` and lazy-loaded
- Key files: `__root.tsx` (providers), `index.tsx` (auth redirect), `login.tsx`, `admin/`, `enduser/`, `official/`

**`frontend/src/hooks/`:**
- Purpose: All React Query API integration; one file per backend domain module
- Contains: Query key factories, `useQuery`/`useMutation` wrappers with cache invalidation
- Key files: `use-person.ts`, `use-organizations.ts`, `use-nda.ts`

**`frontend/src/types/`:**
- Purpose: TypeScript interfaces matching backend JSON shapes
- Contains: One file per domain, named to match the domain (e.g., `person.ts` for `/api/person`)

**`frontend/src/components/ui/`:**
- Purpose: shadcn/ui component primitives
- Contains: Unstyled-then-styled base components (Button, Table, Card, Input, etc.)
- Generated: Partially — shadcn CLI generates initial files; modifications are committed

## Key File Locations

**Entry Points:**
- `backend/src/main.rs`: Rust binary entry — delegates to `create_rocket()`
- `frontend/src/main.tsx`: SPA bootstrap — router + QueryClient
- `frontend/src/routes/__root.tsx`: Provider root wrapping entire app

**Configuration:**
- `backend/src/shared/rocket_setup.rs`: All route mounts + managed state
- `docker-compose.yml`: Port assignments (DB:15530, API:15520, WS:15540, FE:15510)
- `frontend/src/lib/api.ts`: `VITE_API_URL` base URL (default `http://localhost:15520`)
- `frontend/src/contexts/websocket-context.tsx`: `VITE_WS_URL` (default `ws://localhost:15540`)

**Core Logic:**
- `backend/src/auth/jwt.rs`: JWT create/validate (8-hour expiry)
- `backend/src/auth/middleware.rs`: `AuthGuard` — the universal route guard
- `backend/src/shared/rbac.rs`: `role_has_permission()` — DB-backed permission check
- `frontend/src/contexts/auth-context.tsx`: `getDefaultRoute(role)` — role-to-route mapping

**Testing:**
- `backend/tests/`: Rust integration tests using `lib.rs` crate
- `frontend/e2e/`: Playwright E2E specs

## Naming Conventions

**Files (backend):**
- Module directories: `snake_case` (e.g., `info_systems`, `vendor_relations`)
- Source files: `snake_case.rs` (`handlers.rs`, `models.rs`, `rocket_setup.rs`)

**Files (frontend):**
- Route files: `kebab-case.tsx` (e.g., `info-systems.tsx`, `person-relations/`)
- Hook files: `use-kebab-case.ts` (e.g., `use-person.ts`, `use-vendor-relations.ts`)
- Type files: `kebab-case.ts` (e.g., `person.ts`, `info-system.ts`)
- Component files: `kebab-case.tsx` or `PascalCase.tsx` — both exist (`layout.tsx`, `ProtectedRoute.tsx`)
- Co-located page implementations: `_component.tsx` (underscore prefix = not a route segment)

**Directories (frontend routes):**
- Role subtrees: `admin/`, `enduser/`, `official/`
- Dynamic segments: `$paramName` (e.g., `$personId.tsx`, `$vendorId.tsx`)

## Where to Add New Code

**New backend API domain (e.g., `contracts`):**
1. Create `backend/src/contracts/` with `mod.rs`, `models.rs`, `handlers.rs`
2. Follow pattern: `mod.rs` exports models and a `routes()` fn returning `Vec<rocket::Route>`
3. Register module in `backend/src/main.rs` and `backend/src/lib.rs` with `mod contracts;`
4. Mount routes in `backend/src/shared/rocket_setup.rs`: `.mount("/api/contracts", contracts::routes())`
5. Add migration: `backend/migrations/YYYYMMDDHHMMSS_create_contracts_table.sql`

**New frontend feature for an existing domain:**
1. Add TypeScript type to `frontend/src/types/<domain>.ts`
2. Add hook to `frontend/src/hooks/use-<domain>.ts`
3. Add route file to appropriate role subtree: `frontend/src/routes/admin/<feature>.tsx`
4. For complex pages, extract implementation to `frontend/src/routes/admin/<feature>/_component.tsx` and lazy-load it

**New UI component:**
- Shared primitives: `frontend/src/components/ui/<component>.tsx` (follow shadcn/ui pattern)
- Feature-specific: `frontend/src/components/<feature-name>/` subdirectory

**New shared utility (backend):**
- Add to `backend/src/shared/` with a descriptive name and expose via `backend/src/shared/mod.rs`

## Special Directories

**`backend/.sqlx/`:**
- Purpose: Offline query metadata cache for `sqlx::query!` compile-time checking
- Generated: Yes — by `cargo sqlx prepare`
- Committed: Yes (enables CI without live DB)

**`frontend/src/routeTree.gen.ts`:**
- Purpose: Auto-generated route tree consumed by TanStack Router
- Generated: Yes — by Vite plugin on `npm run dev` or `npm run build`
- Committed: Yes (type safety in CI)
- **Never edit manually.**

**`frontend/dist/`:**
- Purpose: Production build output
- Generated: Yes — `npm run build`
- Committed: No (in `.gitignore`)

**`backend/target/`:**
- Purpose: Rust build artifacts
- Generated: Yes
- Committed: No

**`frontend/src/types/personnel.ts.bak`:**
- Purpose: Leftover backup from personnel-to-person refactor
- Generated: No
- Committed: Yes — should be deleted; not imported anywhere

---

*Structure analysis: 2026-05-20*
