# Coding Conventions

**Analysis Date:** 2026-06-18

## Naming Patterns

**Files:**
- Frontend TypeScript: kebab-case (`use-person.ts`, `auth-context.tsx`, `protected-route.tsx`)
- React components: PascalCase files are allowed but kebab-case is the norm (`ProtectedRoute.tsx` is an explicit exception noted in CLAUDE.md as the role-aware guard; `protected-route.tsx` is auth-only)
- Rust source files: snake_case (`handlers.rs`, `models.rs`, `rocket_setup.rs`)

**Functions/Hooks:**
- React hooks: `useXxx` camelCase (`usePersonList`, `useCreatePerson`, `useWebSocket`)
- Rust functions: snake_case (`list_persons`, `create_rocket`)
- Frontend utility functions: camelCase (`apiFetch`, `loginViaUI`)

**Variables:**
- TypeScript: camelCase
- Rust: snake_case
- DB enum strings: SCREAMING_SNAKE_CASE (`TOP_SECRET`, `MILITARY_1`, `ALLOW`, `DENY`)

**Types/Interfaces:**
- TypeScript: PascalCase (`Person`, `ApiError`, `CreatePersonRequest`, `PersonListResponse`)
- Rust structs: PascalCase (`CreatePersonRequest`, `PaginatedResponse`, `AuthGuard`)
- Type imports use explicit `type` keyword: `import type { Person } from "@/types/person"`

**Query Keys:**
- Defined as a const object per domain: `personKeys`, with `all`, `lists()`, `list(...)`, `details()`, `detail(id)` factory methods
- Convention: `[...personKeys.all, "list"] as const`

## Code Style

**Formatting:**
- No Prettier. ESLint 9 flat config enforces style.
- Single quotes for strings in TypeScript
- Trailing commas enabled
- Rust: `rustfmt` (standard)

**Linting:**
- ESLint 9 flat config at `frontend/eslint.config.js`
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters` in `tsconfig.app.json`

## Import Organization

**Frontend:**
1. External packages (e.g., `@tanstack/react-query`, `vitest`)
2. Internal imports using `@/` alias (never relative `../../`)
3. Type imports grouped with `import type { ... }`

**`@/` alias** resolves to `frontend/src/`. Configured in `vite.config.ts` and `tsconfig.app.json`.

**Example:**
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Person, PersonListResponse } from "@/types/person";
```

**Rust:**
- Standard Rust grouping: std, extern crates, crate internals
- Handler files use `super::models::` for sibling imports, `crate::` for cross-module

## API Client Pattern

**Base URL:** `VITE_API_URL` env var or `http://localhost:15520` (no `/api` suffix).

**Every endpoint string must start with `/api/...`** — passed to `apiFetch` / `api.*` in `frontend/src/lib/api.ts`. Omitting `/api` causes silent 404.

**`api` object:**
```typescript
api.get<T>(endpoint)
api.post<T>(endpoint, data)
api.put<T>(endpoint, data)
api.delete(endpoint)
```

**Auth:** JWT read from `localStorage.getItem('token')` and injected as `Authorization: Bearer <token>` in every request.

## Error Handling

**Backend (Rust):**
- Handlers return `Result<Json<T>, Status>` — never panic
- Validation: `validate().map_err(|_| Status::BadRequest)?`
- DB errors: `.map_err(|_| Status::InternalServerError)?`
- Not found: `.ok_or(Status::NotFound)?`
- Raw SQL only: `r#"SELECT ..."#` in `sqlx::query!` / `sqlx::query_scalar`

**Frontend:**
- `ApiError { status, message, data }` thrown from `apiFetch` on non-2xx responses
- Errors rendered inline with `bg-destructive/10 text-destructive` classes — no toasts
- Mutations: use `mutateAsync` in handlers and gate submission buttons on `mutation.isPending`
- Never swallow `ApiError` — propagate to component for display

## React Query Patterns

**Hooks structure:**
- One hook file per domain in `frontend/src/hooks/use-*.ts`
- Each file exports: query hooks (`usePersonList`, `usePerson`), mutation hooks (`useCreatePerson`, `useUpdatePerson`, `useDeletePerson`)
- Mutation `onSuccess` invalidates relevant query keys via `queryClient.invalidateQueries`

**Mutation invalidation:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: personKeys.lists() });
  queryClient.invalidateQueries({ queryKey: personKeys.detail(id) });
}
```

## Backend Handler Pattern

**Every non-login handler** requires `_auth: AuthGuard` as a parameter (JWT bearer guard).

**Route macro placement:** Handlers use RELATIVE paths (`#[get("/<id>")]`). The module is mounted at `/api/<domain>` in `rocket_setup.rs`. Never hardcode `/api/` in handler macros — this double-prefixes the URL.

**Handler signature pattern:**
```rust
#[get("/?<page>&<per_page>&<search>")]
pub async fn list_persons(
    page: Option<i32>,
    per_page: Option<i32>,
    search: Option<String>,
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<PaginatedResponse<Person>>, Status>
```

## Module Structure (Backend)

**Domain module layout** (`backend/src/<domain>/`):
- `mod.rs` — exports + `routes()` function
- `models.rs` — sqlx/serde structs, `#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]`
- `handlers.rs` — Rocket handler functions

**No service layer** — handlers query `PgPool` directly via inline `sqlx`.

## Comments

**Frontend:** Inline comments explain non-obvious behavior, API quirks, and workarounds. File-level comments describe purpose. Avoid redundant comments that restate code.

**Rust:** Doc comments (`///`) on pub structs and helper methods. Inline comments for SQL query construction rationale.

**Test files:** File-level comment blocks document acceptance criteria, phase references (e.g., `T-09-11`), and named pitfall tests. This is mandatory for tests that implement acceptance criteria.

## Routing

**TanStack file-based routing** under `frontend/src/routes/`. Role subtrees: `admin/`, `enduser/`, `official/`.

**`routeTree.gen.ts` is GENERATED** — never hand-edit. Regenerate after route changes with TanStack Router Vite plugin.

**ProtectedRoute distinction:**
- `frontend/src/components/ProtectedRoute.tsx` (PascalCase) — role-aware guard with `allowedRoles` prop
- `frontend/src/components/protected-route.tsx` (kebab-case) — auth-only, no role check
- Always use `ProtectedRoute` with `allowedRoles` for new protected routes

## UI Component Rules

- **shadcn/ui** (Radix-based) for all UI components. Registry config at `frontend/components.json`.
- **`Dialog` is hand-rolled** (`frontend/src/components/ui/dialog.tsx`) — not Radix. Has `role="dialog"` but no focus-trap/portal.
- **`<SelectItem value="">` crashes** — Radix throws on empty string value. Use sentinel (`value="ALL"`) and treat as "no filter".

---

*Convention analysis: 2026-06-18*
