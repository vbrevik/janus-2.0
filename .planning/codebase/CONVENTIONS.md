# Coding Conventions

**Analysis Date:** 2026-06-23

## Naming Patterns

**Files:**
- Frontend TS/TSX: kebab-case for modules/hooks/libs — `use-person.ts`, `api.ts`, `auth-context.tsx`. Page logic co-located as `_component.tsx` under each route dir (`frontend/src/routes/admin/person/_component.tsx`).
- React component files exporting a component use PascalCase names internally but kebab-case filenames; the canonical guard is the exception: `frontend/src/components/ProtectedRoute.tsx` (PascalCase file) vs the auth-only lowercase `protected-route.tsx` — do not confuse them.
- Backend Rust: snake_case files — each domain is `mod.rs`, `models.rs`, `handlers.rs` under `backend/src/<domain>/`.
- Test files: `*.test.ts(x)` co-located next to source (`frontend/src/hooks/use-websocket.test.ts`); e2e specs are `*.spec.ts` under `frontend/e2e/`.

**Functions:**
- Frontend: camelCase (`apiFetch`, `usePersonList`, `principalFromSubject`); React hooks prefixed `use*`.
- Backend: snake_case Rocket handler fns (`list_persons`, `get_person`, `create_person`).

**Variables:**
- camelCase (frontend), snake_case (backend). Query-key factories use a frozen object pattern: `personKeys` in `frontend/src/hooks/use-person.ts` with `as const` tuples.

**Types:**
- PascalCase everywhere — TS interfaces/types (`Person`, `CreatePersonRequest`, `ApiError`) and Rust structs (`Person`, `PaginationParams`, `PaginatedResponse<T>`).
- DB string enums are SCREAMING_SNAKE_CASE: clearance levels `UNCLASSIFIED | CONFIDENTIAL | SECRET | TOP_SECRET` (DB CHECK constraint — not `NONE`).

## Code Style

**Formatting:**
- No Prettier. Frontend style is enforced only by ESLint + author discipline.
- **Quote style is inconsistent in practice.** CLAUDE.md mandates single quotes + trailing commas, and core files like `frontend/src/lib/api.ts` use single quotes. But newer demo/spike/test code (`frontend/src/demo/lib/abac.test.ts`, `frontend/src/hooks/use-websocket.test.ts`) uses double quotes. **When editing an existing file, match that file's prevailing quote style; for new files prefer single quotes per CLAUDE.md.**
- Backend: `rustfmt` defaults (no `rustfmt.toml` present). Raw SQL written in `r#"..."#` strings.

**Linting:**
- ESLint 9 flat config — `frontend/eslint.config.js`. Extends `js.configs.recommended`, `tseslint.configs.recommended`, `react-hooks` recommended-latest, and `react-refresh` vite. Ignores `dist`.
- Strict TypeScript — `frontend/tsconfig.app.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`, `erasableSyntaxOnly`.
- Run: `cd frontend && npm run lint` (`eslint .`). Build is `tsc -b && vite build` (type errors break the build).

## Import Organization

**Order (observed):**
1. External packages (react, @tanstack/*, rocket, sqlx, validator)
2. Internal modules
3. Type-only imports (often grouped with `import type { ... }`)

**Path Aliases:**
- Frontend: `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`). **Always use `@/`; never `../../` relative climbing.**
- Backend: `crate::` / `super::` Rust module paths (`use crate::auth::middleware::AuthGuard;`, `use super::models::{...}`).

## Error Handling

**Backend:**
- Handlers return `Result<Json<T>, Status>` and never panic.
- Canonical mappings: `validate().map_err(|_| Status::BadRequest)?`, `.map_err(|_| Status::InternalServerError)?`, `.ok_or(Status::NotFound)?`.
- Inputs validated with the `validator` crate (`pagination.validate()`, request structs derive `Validate`).
- Every non-login handler takes an `AuthGuard` (Bearer-JWT request guard); use `_auth: AuthGuard` when the value is unused.

**Frontend:**
- `apiFetch<T>` throws `ApiError { status, data }` (`frontend/src/lib/api.ts`) — a custom `Error` subclass carrying HTTP status.
- API base URL has NO `/api` suffix; every endpoint string must start with `/api/...` or it 404s silently.
- Errors propagate to React Query; render inline with `bg-destructive/10 text-destructive` — no toast system. Use `mutateAsync` in handlers and gate buttons on `mutation.isPending`.

## Logging

**Backend:** `RUST_LOG` env + Rocket/`log` (run with `RUST_LOG=info cargo run`). No structured logging framework.

**Frontend:** `console` only (e.g. WebSocket reconnect chatter). No client logging library.

## Comments

**When to Comment:**
- Inline comments explain non-obvious intent and gotchas (SQL-binding safety in `person/handlers.rs`, "arrow fns can't be constructors" in the WS test mock). Keep comments to the *why*, not the *what*.
- No enforced JSDoc/TSDoc or Rust doc-comment convention; doc comments are sparse.

## Function Design

**Size:** Handlers and hooks are moderate; `backend/src/person/handlers.rs` is ~390 lines holding the full person CRUD surface (one fn per verb).

**Parameters:** Rocket handlers take route params as `Option<T>` with `.unwrap_or(default)`; `db: &State<PgPool>` injected; `AuthGuard` last. Frontend hooks take primitive args with defaults (`usePersonList(page = 1, perPage = 10, search = "")`).

**Return Values:** Backend `Result<Json<T>, Status>`; list endpoints return `PaginatedResponse<T>` = `{ items, total, page, per_page, total_pages }`. Frontend hooks return React Query result objects.

## Module Design

**Backend:** Flat domain modules; `mod.rs` exports + a `routes()` fn. **No service layer** — handlers query `PgPool` directly via inline `sqlx`. Cross-cutting infra lives in `backend/src/shared/` (`rocket_setup.rs`, `response.rs`, `pagination.rs`, `error.rs`, `rbac.rs`, `auth/middleware.rs`).

**Frontend:** Data layer = React Query hooks in `src/hooks/use-*.ts` → `src/lib/api.ts`. Global state via `AuthContext` (JWT in `localStorage`) + `WebSocketContext`, provided in `routes/__root.tsx`. Query keys via centralized `*Keys` factory objects.

**Exports/Barrel files:** Hooks export named functions plus a `personKeys`-style const. `routeTree.gen.ts` is GENERATED — never hand-edit.

---

*Convention analysis: 2026-06-23*
