# Codebase Structure

**Analysis Date:** 2026-06-18

## Directory Layout

```
janus-2.0/
├── backend/                    # Rust/Rocket REST API
│   ├── migrations/             # sqlx migration SQL files (timestamped)
│   ├── src/
│   │   ├── main.rs             # Binary entry point
│   │   ├── lib.rs              # Library root (for integration tests)
│   │   ├── shared/             # Cross-cutting infra (DB, JWT, RBAC, response types)
│   │   ├── auth/               # Login, JWT, AuthGuard middleware
│   │   ├── person/             # Person CRUD (unified users + contacts)
│   │   ├── access/             # Computer/data/physical access grants
│   │   ├── roles/              # Roles + permissions
│   │   ├── organizations/      # Organization CRUD
│   │   ├── nda/                # NDA management
│   │   ├── audit/              # Audit log queries
│   │   ├── discussions/        # Discussions
│   │   ├── document_references/# Document reference attachments
│   │   ├── info_systems/       # Information systems
│   │   ├── messaging/          # WebSocket server + manager
│   │   ├── relations/          # Person–entity relations
│   │   └── vendor_relations/   # Vendor hierarchy relations
│   └── tests/                  # Integration tests (use lib.rs)
├── frontend/                   # React 19 + TanStack SPA
│   └── src/
│       ├── main.tsx            # Frontend entry point
│       ├── routeTree.gen.ts    # GENERATED — never hand-edit
│       ├── routes/             # TanStack file-based routes
│       │   ├── __root.tsx      # Root layout (AuthProvider + WebSocketProvider)
│       │   ├── index.tsx       # Redirect / → role default route
│       │   ├── login.tsx       # Public login page
│       │   ├── admin/          # Admin role subtree (active)
│       │   ├── enduser/        # Enduser role subtree (active)
│       │   ├── official/       # Official role subtree (active)
│       │   ├── access/         # LEGACY — do not use
│       │   ├── audit/          # LEGACY — do not use
│       │   ├── ndas/           # LEGACY — do not use
│       │   ├── organizations/  # LEGACY — do not use
│       │   ├── person/         # LEGACY — do not use
│       │   ├── person-relations/ # LEGACY — do not use
│       │   └── roles/          # LEGACY — do not use
│       ├── contexts/           # React contexts (auth, websocket)
│       ├── hooks/              # React Query hooks (use-*.ts)
│       ├── lib/                # API client + utilities
│       ├── types/              # TypeScript domain types
│       ├── components/         # Shared UI components
│       │   ├── ProtectedRoute.tsx  # Role-aware guard (use this)
│       │   ├── protected-route.tsx # Auth-only guard (legacy — avoid)
│       │   ├── layout.tsx      # Shared chrome (nav, profile, logout)
│       │   ├── person-details/ # Person detail subcomponents
│       │   └── ui/             # shadcn/ui primitives
│       ├── demo/               # Offline ABAC/grant simulation subsystem
│       │   ├── DemoRoot.tsx    # Demo app entry (WorldStateProvider)
│       │   ├── lib/            # Domain model, seed data, ABAC logic
│       │   │   ├── model.ts    # All TypeScript domain types
│       │   │   ├── seed.ts     # Fixture data sets
│       │   │   ├── abac.ts     # ABAC evaluation engine
│       │   │   ├── policy.ts   # Policy logic
│       │   │   ├── contract.ts # Inter-entity exchange contracts
│       │   │   ├── credential.ts
│       │   │   ├── obligations.ts
│       │   │   └── digital-resource-selectors.ts
│       │   ├── store/
│       │   │   └── world-state.tsx  # useReducer world-state store
│       │   └── components/     # Demo UI components
│       ├── spikes/             # Earlier prototype implementations (reference only)
│       │   ├── lib/            # Spike-era model + logic files
│       │   └── components/     # Spike UI components
│       └── assets/             # Static assets
├── docs/                       # Feature documentation
├── scripts/                    # Shell utilities
├── .planning/                  # GSD planning artifacts
│   ├── codebase/               # Codebase map documents (this directory)
│   ├── phases/                 # Phase plans (NN-name/PLAN.md)
│   ├── milestones/             # Milestone definitions
│   ├── spikes/                 # Research spikes
│   └── seeds/                  # Deferred feature seeds
├── .claude/                    # Claude Code config + skills
├── docker-compose.dev.yml      # Dev: postgres :15530
└── docker-compose.yml          # Production compose
```

## Directory Purposes

**`backend/src/shared/`:**
- Purpose: Cross-cutting backend infrastructure
- Contains: `rocket_setup.rs` (app bootstrap), `auth/middleware.rs` (AuthGuard), `rbac.rs` (permission check), `response.rs` (ApiResponse/PaginatedResponse), `pagination.rs`, `error.rs`, `database.rs`
- Key files: `backend/src/shared/rocket_setup.rs`, `backend/src/shared/response.rs`

**`backend/src/<domain>/`:**
- Purpose: One vertical slice per domain entity
- Contains: `mod.rs` (routes fn + re-exports), `models.rs` (sqlx/serde structs), `handlers.rs` (Rocket handler fns)
- Key files: `backend/src/person/handlers.rs`, `backend/src/access/handlers.rs`

**`backend/migrations/`:**
- Purpose: Ordered sqlx migration SQL files
- Contains: timestamped `.sql` files; note: ALTER-before-CREATE issues mean `sqlx migrate run` on a clean DB fails
- Key concern: `20250131000000_create_person_table_unified.sql` is the authoritative person schema

**`frontend/src/routes/admin/`:**
- Purpose: Active admin-role page tree
- Contains: `dashboard/`, `person/`, `access/`, `ndas/`, `organizations/`, `roles/`, `audit/`, `discussions/`
- Key files: `frontend/src/routes/admin/person/_component.tsx` (heavy list page), `frontend/src/routes/admin/person/$personId.tsx` (detail page)

**`frontend/src/hooks/`:**
- Purpose: React Query data hooks — one file per domain
- Contains: `use-person.ts`, `use-access.ts`, `use-nda.ts`, `use-roles.ts`, `use-organizations.ts`, `use-audit.ts`, `use-discussions.ts`, `use-document-references.ts`, `use-info-systems.ts`, `use-relations.ts`, `use-vendor-relations.ts`, `use-websocket.ts`

**`frontend/src/demo/lib/`:**
- Purpose: Self-contained offline ABAC simulation library
- Contains: `model.ts` (41 KB — all domain types), `seed.ts` (51 KB — fixture data), logic files
- Key files: `frontend/src/demo/lib/model.ts`, `frontend/src/demo/lib/seed.ts`

**`frontend/src/spikes/`:**
- Purpose: Earlier prototype code — read-only reference; do not extend
- Generated: No
- Committed: Yes (historical reference)

## Key File Locations

**Entry Points:**
- `backend/src/main.rs`: Backend binary entry
- `backend/src/shared/rocket_setup.rs`: All route mounts and app wiring
- `frontend/src/main.tsx`: Frontend React entry
- `frontend/src/routes/__root.tsx`: Root React tree with global providers
- `frontend/src/routes/index.tsx`: Root redirect by role

**Configuration:**
- `backend/.env` / env vars: `DATABASE_URL`, `JWT_SECRET`, `ROCKET_PORT`
- `frontend/vite.config.ts`: Vite build config
- `frontend/tsconfig.json`: TypeScript config (strict, `@/` alias)
- `docker-compose.dev.yml`: Dev Postgres on :15530

**Core Logic:**
- `backend/src/shared/rbac.rs`: DB-backed permission check
- `backend/src/auth/middleware.rs`: JWT `AuthGuard` request guard
- `frontend/src/lib/api.ts`: HTTP client (`apiFetch`, `ApiError`)
- `frontend/src/contexts/auth-context.tsx`: Auth state + `getDefaultRoute`
- `frontend/src/components/ProtectedRoute.tsx`: Role-based route guard
- `frontend/src/demo/store/world-state.tsx`: Offline world-state reducer

**Testing:**
- `frontend/src/**/*.test.ts(x)`: Vitest unit tests (co-located with source)
- `frontend/src/demo/lib/*.test.ts`: Demo logic tests
- `frontend/src/spikes/lib/*.test.ts`: Spike logic tests
- `backend/tests/`: Rust integration tests
- `frontend/tests/` or `playwright.config.ts`: Playwright e2e

## Naming Conventions

**Backend files:**
- Rust files: `snake_case.rs`
- Domain structs/types: `PascalCase`
- Handler fns, model fields: `snake_case`
- DB string enums: `SCREAMING_SNAKE_CASE` (e.g. `UNCLASSIFIED`, `TOP_SECRET`)

**Frontend files:**
- TypeScript/TSX files: `kebab-case.ts(x)` (e.g. `use-person.ts`, `auth-context.tsx`)
- React components (in file): `PascalCase`
- Hooks: `useXxx`
- Route files follow TanStack conventions: `index.tsx`, `$paramId.tsx`, `_component.tsx`

**Directories:**
- Backend domains: `snake_case` (e.g. `vendor_relations/`, `info_systems/`)
- Frontend: `kebab-case` (e.g. `person-details/`, `person-relations/`)

## Where to Add New Code

**New backend domain:**
1. Create `backend/src/<domain>/mod.rs`, `models.rs`, `handlers.rs`
2. Declare in `backend/src/lib.rs` and import in `backend/src/shared/rocket_setup.rs`
3. Mount via `.mount("/api/<domain>", <domain>::routes())` in `rocket_setup.rs`
4. Add migration SQL in `backend/migrations/` with next timestamp

**New frontend page (admin role):**
1. Create directory under `frontend/src/routes/admin/<feature>/`
2. Add `index.tsx` (route component) and optionally `_component.tsx` for heavy list logic
3. Regenerate route tree: `npm run tsr generate` or equivalent
4. Wrap with `<ProtectedRoute allowedRoles={['admin']}>` in route component
5. Add React Query hook in `frontend/src/hooks/use-<feature>.ts`
6. Add TypeScript types in `frontend/src/types/<feature>.ts`

**New React Query hook:**
- Implementation: `frontend/src/hooks/use-<domain>.ts`
- Pattern: import `apiFetch` from `@/lib/api`, import types from `@/types/<domain>`

**New shared UI component:**
- Implementation: `frontend/src/components/<component-name>.tsx`
- shadcn/ui primitives: `frontend/src/components/ui/`

**New demo model or seed:**
- Types: `frontend/src/demo/lib/model.ts`
- Seed data: `frontend/src/demo/lib/seed.ts`
- Logic: new file in `frontend/src/demo/lib/<feature>.ts`

**Utilities:**
- Shared frontend helpers: `frontend/src/lib/utils.ts`

## Special Directories

**`frontend/src/routes/` (flat legacy routes):**
- Purpose: Pre-pivot duplicate pages (access, audit, ndas, organizations, person, person-relations, roles)
- Generated: No
- Committed: Yes
- Status: Do not use or extend — work in `admin/`, `enduser/`, `official/` subtrees only

**`frontend/src/routeTree.gen.ts`:**
- Purpose: TanStack Router auto-generated route tree
- Generated: Yes (by `tsr generate`)
- Committed: Yes
- Never hand-edit

**`backend/.sqlx/`:**
- Purpose: sqlx offline query cache (compile-time query checking without live DB)
- Generated: Yes
- Committed: Yes

**`.planning/`:**
- Purpose: GSD workflow artifacts (phase plans, codebase maps, spikes, seeds)
- Generated: Partially (by GSD commands)
- Committed: Yes

---

*Structure analysis: 2026-06-18*
