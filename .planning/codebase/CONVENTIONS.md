# Coding Conventions

**Analysis Date:** 2026-05-20

## Naming Patterns

**Files (Frontend):**
- Route files: `kebab-case.tsx` — e.g., `info-systems.tsx`, `dashboard.tsx`
- Route component implementations: `_component.tsx` (underscore prefix) — placed alongside the route file in the same directory
- Hook files: `use-kebab-case.ts` — e.g., `use-person.ts`, `use-websocket.ts`
- Type files: `kebab-case.ts` — e.g., `person.ts`, `info-system.ts`
- Context files: `kebab-case-context.tsx` — e.g., `auth-context.tsx`
- UI component files: `kebab-case.tsx` — e.g., `button.tsx`, `dropdown-menu.tsx`

**Files (Backend):**
- Module directories: `snake_case` — e.g., `info_systems/`, `document_references/`
- Source files: `snake_case.rs` — e.g., `handlers.rs`, `models.rs`, `mod.rs`
- Test files: `snake_case_test.rs` — e.g., `info_systems_test.rs`, `nda_test.rs`

**Functions (Frontend):**
- React components: `PascalCase` — e.g., `PersonListPage`, `ClearanceBadge`
- Hooks: `camelCase` with `use` prefix — e.g., `usePersonList`, `useCreatePerson`
- Regular functions: `camelCase` — e.g., `loginAsRole`, `getDefaultRoute`
- Event handlers: `on` prefix — e.g., `onSave`, `onDelete`, `onCreate`

**Functions (Backend):**
- Handler functions: `snake_case` — e.g., `list_persons`, `get_info_system`, `create_person`
- Helper functions: `snake_case` — e.g., `validate_environment`, `validate_status`, `auth_header`
- Validation helpers: descriptive `snake_case` — e.g., `validate_environment`, `get_auth_token`

**Variables (Frontend):**
- All variables: `camelCase`
- Constants/query keys: `camelCase` with descriptive suffix — e.g., `personKeys`, `adminNavItems`
- TypeScript types: `PascalCase` — e.g., `NavItem`, `AuthContextType`, `MockWebSocket`
- TypeScript interfaces: `PascalCase` — e.g., `Person`, `CreatePersonRequest`
- Type aliases: `PascalCase` — e.g., `ClearanceLevel`

**Variables (Backend):**
- All variables: `snake_case`
- Types/structs: `PascalCase` — e.g., `InfoSystem`, `CreateInfoSystemRequest`, `AuthGuard`

**Enums / Constants (Backend):**
- String enums stored as `SCREAMING_SNAKE_CASE` in database — e.g., `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `TOP_SECRET`
- Validated via custom validator functions on model structs

## Code Style

**Formatting (Frontend):**
- No `.prettierrc` — relies on ESLint for formatting enforcement
- Single quotes for string literals throughout TypeScript/TSX
- Trailing commas in multi-line structures (enforced by TypeScript ESLint)
- `ES2022` target, `strict` mode enabled

**Linting (Frontend):**
- Tool: ESLint 9 with `eslint.config.js` (flat config)
- Extends: `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs['recommended-latest']`, `reactRefresh.configs.vite`
- TypeScript strict: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`
- No custom rule overrides beyond default plugin recommendations

**Formatting (Backend):**
- Rust standard `rustfmt` formatting (implicit via Cargo)
- All raw SQL queries use raw string literals `r#"..."#` for multi-line clarity
- Module-level comment headers: `// Module name - purpose` at top of each file

## Import Organization

**Frontend order (observed pattern):**
1. React and standard library — `import { useState } from 'react'`
2. Third-party packages (TanStack, Lucide, etc.) — `import { useQuery } from '@tanstack/react-query'`
3. Internal aliases starting with `@/` — contexts, components, hooks, types
4. Type-only imports at end — `import type { Person } from '@/types/person'`

**Path Aliases (Frontend):**
- `@/*` maps to `./src/*` — configured in both `tsconfig.app.json` and `vite.config.ts`
- Use `@/` prefix for all internal imports; never use relative paths like `../../`

**Backend imports:**
- Rocket macros and types first: `use rocket::{State, get, post, ...}`
- SQLx: `use sqlx::PgPool`
- Internal crate modules: `use super::models::*`, `use crate::auth::middleware::AuthGuard`

## Error Handling

**Frontend — API errors:**
- Custom `ApiError` class defined in `src/lib/api.ts` with `status: number` and `data?: any`
- All API calls propagate `ApiError` upward; components catch and render inline error UI
- Error display pattern: `<div className="bg-destructive/10 text-destructive p-4 rounded-md">Error: {err.message}</div>`
- No toast notifications — errors are rendered inline in the component

**Frontend — Async mutations:**
- Use `mutateAsync` (throws on error) rather than `mutate` in event handlers
- Mutations wrapped in try/catch at the handler level where error feedback is needed
- Pending state tracked via `mutation.isPending` to disable buttons

**Backend — HTTP handlers:**
- All handlers return `Result<Json<T>, Status>` — never panic
- Validation errors: `request.validate().map_err(|_| Status::BadRequest)?`
- Database errors: `.map_err(|_| Status::InternalServerError)?`
- Not found: `.ok_or(Status::NotFound)?` on `fetch_optional`
- Debug logging to stderr on DB errors: `eprintln!("Database error: {:?}", e)` (inconsistently applied)

**Backend — Validation:**
- Use `validator` crate with `#[derive(Validate)]` on request structs
- Custom validators written as `fn validate_x(val: &str) -> Result<(), validator::ValidationError>`
- Validated at start of each handler: `person_request.validate().map_err(|_| Status::BadRequest)?`

## Logging

**Frontend:** No structured logging framework. Development-only: none. Errors surfaced via inline UI.

**Backend:**
- `env_logger` and `log` crates are declared as dependencies but not consistently used
- Actual logging: `println!` for startup messages, `eprintln!` for database errors in handlers
- Pattern is ad hoc — not all handlers log errors

## Comments

**When to Comment (Frontend):**
- JSDoc on exported utility functions: `/** Get the default route for a user role after login */`
- JSDoc with `@example` blocks on component props interfaces
- Inline comments explaining non-obvious logic — e.g., `// Use person_id from response`
- Comment out `.bak` files for deprecated route variants (e.g., `$personnelId.tsx.bak`)

**When to Comment (Backend):**
- Module-level comment header on every file: `// Module name - purpose`
- Inline comments for multi-step logic — e.g., `// Soft delete by setting deleted_at timestamp`
- `// TODO:` for known gaps (see CONCERNS.md)

## Function Design

**Frontend component size:** Route page components (`_component.tsx`) are large (200-335 lines), containing sub-components inline in the same file. Smaller helper components (e.g., `ClearanceBadge`, `PersonRow`, `CreatePersonRow`) are defined as private functions at the bottom of the file.

**Hook design:** Each domain entity has a dedicated hook file in `src/hooks/`. Hooks export individual named functions — one per operation (list, detail, create, update, delete). Query keys are defined as a typed constant object at top of hook file:
```typescript
export const personKeys = {
  all: ['persons'] as const,
  lists: () => [...personKeys.all, 'list'] as const,
  list: (page: number, perPage: number) => [...personKeys.lists(), { page, perPage }] as const,
  // ...
}
```

**Backend handler size:** Handlers are medium-length (20-80 lines). Complex update operations use dynamic query building — a verbose pattern that pushes handler length up (see CONCERNS.md).

**Parameters:** Handlers receive dependencies via Rocket's request guards: `db: &State<PgPool>`, `_auth: AuthGuard`.

## Module Design

**Frontend exports:**
- Named exports for all hooks, components, and utilities — no default exports except for route `_component.tsx` files (which use `export default function`)
- Route files export a single `Route` constant: `export const Route = createFileRoute('/path')({...})`
- No barrel `index.ts` files — imports reference specific files directly

**Backend module structure:**
- Each domain has a directory (`person/`, `info_systems/`, etc.) with exactly three files: `mod.rs`, `models.rs`, `handlers.rs`
- `mod.rs` defines the module's `routes()` function returning a `Vec<Route>` and re-exports needed items
- `lib.rs` declares all top-level modules and exports `crate::` paths used by integration tests

## React Patterns

**Route structure:** TanStack Router file-based routing. Route files are thin shells — they only define the `Route` constant with a `Suspense` wrapper. Actual page implementation lives in `_component.tsx` in the same directory.

**Data fetching:** TanStack Query (`@tanstack/react-query`) for all server state. No direct `fetch` in components.

**Form state:** Local `useState` with a form object — not react-hook-form (despite it being a dependency). Pattern:
```typescript
const [form, setForm] = useState({ field: '', ... })
// Updates via spread: setForm({ ...form, field: newValue })
```

**Protected routes:** Two `ProtectedRoute` components exist (inconsistency — see CONCERNS.md):
- `src/components/protected-route.tsx` — simple auth check only, no role enforcement
- `src/components/ProtectedRoute.tsx` — role-based guard with `allowedRoles: string[]` prop

**Auth state persistence:** Token and user object stored in `localStorage`. Loaded on mount in `AuthProvider` via `useEffect`.

---

*Convention analysis: 2026-05-20*
