# Codebase Structure

**Analysis Date:** 2026-06-23

## Directory Layout

```
janus-2.0/
├── backend/
│   ├── src/
│   │   ├── main.rs           # Entry → shared::rocket_setup::create_rocket()
│   │   ├── lib.rs            # Crate root: declares domain modules
│   │   ├── shared/           # Cross-cutting infra (setup, response, pagination, error, rbac)
│   │   ├── auth/             # Login, JWT, AuthGuard middleware
│   │   ├── person/           # Unified users+contacts
│   │   ├── organizations/    # Org domain
│   │   ├── roles/            # Roles & permissions
│   │   ├── access/           # Computer/data/physical access grants
│   │   ├── nda/              # NDAs
│   │   ├── discussions/      # Discussions
│   │   ├── relations/        # Person/entity relations
│   │   ├── vendor_relations/ # Vendor hierarchy
│   │   ├── document_references/ # Document refs
│   │   ├── info_systems/     # Information systems
│   │   ├── audit/            # Audit logs
│   │   └── messaging/        # WebSocket server (:15540)
│   └── migrations/           # sqlx SQL migrations (timestamp-prefixed)
├── frontend/
│   └── src/
│       ├── main.tsx          # Real entry (App.tsx is unused scaffold)
│       ├── routeTree.gen.ts  # GENERATED — never hand-edit
│       ├── routes/           # File-based routes (admin/, enduser/, official/ subtrees)
│       ├── hooks/            # React Query hooks (use-*.ts)
│       ├── lib/              # api.ts (apiFetch), utils.ts
│       ├── contexts/         # auth-context.tsx, websocket-context.tsx
│       ├── components/       # ProtectedRoute.tsx, layout.tsx, ui/, person-details/
│       ├── types/            # Shared TS types
│       ├── demo/             # Mock dataset demo (store/components/lib)
│       └── spikes/           # Throwaway spike experiments
├── docs/
├── scripts/
├── docker-compose.dev.yml    # Postgres :15530
└── docker-compose.yml
```

## Directory Purposes

**`backend/src/<domain>/`:**
- Purpose: One bounded context per directory.
- Contains: `mod.rs` (exports + `routes()`), `models.rs` (sqlx/serde structs), `handlers.rs` (Rocket fns).
- Key files: `backend/src/person/mod.rs`, `backend/src/person/handlers.rs`.

**`backend/src/shared/`:**
- Purpose: Cross-cutting infra used by all domains + bootstrap.
- Key files: `rocket_setup.rs`, `response.rs`, `pagination.rs`, `error.rs`, `rbac.rs`, `database.rs`.

**`backend/migrations/`:**
- Purpose: sqlx SQL migrations.
- Note: Migration chain is drifted — `sqlx migrate run` fails on a clean DB (ALTER-before-CREATE, dup versions, zombie rename). Verify columns/FKs against the live DB before writing SQL.

**`frontend/src/routes/`:**
- Purpose: TanStack file-based routes; role subtrees `admin/`, `enduser/`, `official/`.
- Contains: route files + co-located `_component.tsx` for heavy page logic.
- Note: Top-level flat dirs (`access/`, `roles/`, `ndas/`, `organizations/`, ...) are deprecated pre-pivot duplicates — work in `/admin/*`.

**`frontend/src/hooks/`:**
- Purpose: React Query hooks, one file per domain (`use-person.ts`, `use-access.ts`, ...).

**`frontend/src/demo/` and `frontend/src/spikes/`:**
- Purpose: Mock-dataset demo UI and throwaway spike experiments. Not production routes.

## Key File Locations

**Entry Points:**
- `backend/src/main.rs`: Backend bootstrap.
- `backend/src/shared/rocket_setup.rs`: Route mounting, DB pool, CORS, WS spawn.
- `frontend/src/main.tsx`: Frontend bootstrap (RouterProvider + QueryClient).
- `frontend/src/routes/__root.tsx`: Context providers + Layout chrome.
- `frontend/src/routes/index.tsx`: `/` role-based redirect.

**Configuration:**
- `docker-compose.dev.yml`: Postgres on :15530.
- `frontend/vite.config.ts`, `frontend/eslint.config.*`: Build/lint.
- `.env` (backend): `DATABASE_URL`, `JWT_SECRET` (existence only — never read).

**Core Logic:**
- `frontend/src/lib/api.ts`: `apiFetch`, `ApiError{status}`, auth-header injection.
- `frontend/src/contexts/auth-context.tsx`: JWT + `getDefaultRoute`.
- `backend/src/auth/middleware.rs`: `AuthGuard`.

**Testing:**
- `frontend/src/**/*.test.ts(x)`: Vitest unit (jsdom).
- `frontend/tests/` / `e2e`: Playwright (excluded from Vitest run).

## Naming Conventions

**Files:**
- TS files: kebab-case (`use-person.ts`, `auth-context.tsx`).
- React components: PascalCase (`ProtectedRoute.tsx`).
- Rust files: snake_case (`rocket_setup.rs`, `mod.rs`).
- Migrations: `<timestamp>_<description>.sql`.

**Directories:**
- Backend domains: snake_case (`vendor_relations/`, `info_systems/`).
- Frontend route subtrees: kebab/lowercase (`admin/`, `person-relations/`).

**Symbols:**
- Rust fns/files snake_case, types/structs PascalCase; DB string enums SCREAMING_SNAKE_CASE.
- Frontend hooks `useXxx`.

## Where to Add New Code

**New backend domain:**
- Create `backend/src/<domain>/` with `mod.rs` (`routes()` + re-exports), `models.rs`, `handlers.rs`.
- Declare the module in `backend/src/lib.rs`.
- Mount in `backend/src/shared/rocket_setup.rs` (`.mount("/api/<domain>", <domain>::routes())`) using RELATIVE handler paths.

**New backend feature on existing domain:**
- Add handler fn to `<domain>/handlers.rs`, struct to `models.rs`, list it in `<domain>/mod.rs::routes()` (and individual mounts in `rocket_setup.rs` if mounted at `/`).

**New frontend page:**
- Add a route file under the correct role subtree (`frontend/src/routes/admin/...`); heavy logic in co-located `_component.tsx`. Wrap with `ProtectedRoute allowedRoles`. Regenerate `routeTree.gen.ts`.

**New frontend data access:**
- Add `frontend/src/hooks/use-<domain>.ts`; call `apiFetch('/api/<domain>')`.

**Utilities:**
- Frontend shared helpers: `frontend/src/lib/utils.ts`.
- Backend shared helpers: `backend/src/shared/`.

**Imports:** Use `@/` (→ `src/`) for all frontend internal imports; never `../../`.

## Special Directories

**`frontend/src/routeTree.gen.ts`:**
- Generated: Yes (TanStack). Committed: Yes. Never hand-edit.

**`frontend/node_modules/`, `backend/target/`:**
- Generated: Yes. Committed: No.

**`frontend/src/spikes/`, `frontend/src/demo/`:**
- Throwaway/experimental. Committed: Yes. Not production routes.

---

*Structure analysis: 2026-06-23*
