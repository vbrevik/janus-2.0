# Technology Stack

**Analysis Date:** 2026-06-23

## Languages

**Primary:**
- Rust (edition 2021) - Backend API (`backend/src/`)
- TypeScript ~5.9.3 - Frontend SPA (`frontend/src/`)

**Secondary:**
- SQL (PostgreSQL dialect) - Migrations in `backend/migrations/`, raw queries in handlers (`r#"..."#`)
- Bash - Verification/test scripts at repo root (`verify-backend.sh`, `test-nda-endpoints.sh`, etc.)

## Runtime

**Environment:**
- Rust 1.87 toolchain (per project constraints; `s3-tokio` chosen for Rust 1.86+ compatibility) - backend
- Node.js (Vite 7 / modern ESM; `@types/node` ^24) - frontend tooling. `type: module` in `frontend/package.json`
- Tokio 1.x async runtime (`features = ["full"]`) - backend

**Package Manager:**
- Cargo - backend (`backend/Cargo.toml`)
- npm - frontend (`frontend/package.json`). Lockfile: `frontend/package-lock.json` (present, not read)

## Frameworks

**Core (backend):**
- Rocket 0.5 (`features = ["json"]`) - HTTP web framework (`backend/src/shared/rocket_setup.rs`)
- sqlx 0.7 (`runtime-tokio-native-tls`, `postgres`, `uuid`, `chrono`, `json`) - async PostgreSQL access; handlers query `PgPool` directly, no service layer
- tokio-tungstenite 0.21 + futures-util 0.3 - standalone WebSocket server (`backend/src/messaging/websocket.rs`)

**Core (frontend):**
- React 19.1 (`react`, `react-dom`) - UI
- TanStack Router 1.133 (file-based, `@tanstack/router-vite-plugin`) - routing; `frontend/src/routeTree.gen.ts` is GENERATED
- TanStack Query 5.90 - server-state/data fetching (hooks in `src/hooks/use-*.ts`)
- shadcn/ui on Radix primitives (`@radix-ui/react-select`, `react-dropdown-menu`, `react-icons`) - components
- react-hook-form 7.65 + `@hookform/resolvers` + zod 4.1 - forms/validation
- Tailwind CSS 3.4 (+ postcss, autoprefixer) - styling; `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`

**Testing:**
- Vitest 4.0 (jsdom 28) + `@testing-library/react` 16 + `@testing-library/jest-dom` - frontend unit (`npm run test`)
- Playwright 1.56 (`@playwright/test`) - frontend e2e (excluded from Vitest run)
- tokio-test 0.4 - backend dev-dependency

**Build/Dev:**
- Vite 7.1 (`@vitejs/plugin-react` 5) - frontend dev server / bundler (`vite.config.ts`)
- TypeScript compiler (`tsc -b` before `vite build`)
- ESLint 9 flat config (`eslint.config.js`) + `typescript-eslint` 8.45 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. No prettier.

## Key Dependencies

**Critical (backend):**
- jsonwebtoken 9.2 - JWT issuance/verification (Bearer auth via `AuthGuard`)
- bcrypt 0.15 - password hashing
- validator 0.16 (`derive`) - request validation
- serde 1.0 / serde_json 1.0 - (de)serialization of sqlx/Rocket models
- uuid 1.5 (`v4`, `serde`) - entity IDs
- chrono 0.4 (`serde`) - timestamps

**Infrastructure (backend):**
- rocket_cors 0.6 - CORS (`backend/src/shared/rocket_setup.rs`)
- s3-tokio 0.39 (aliased as `s3`) - MinIO/S3 object storage client (`backend/src/document_references/handlers.rs`)
- dotenvy 0.15 - `.env` loading
- base64 0.22 - encoding
- log 0.4 + env_logger 0.11 - logging (`RUST_LOG`)

**Critical (frontend):**
- zod 4.1 - schema validation
- @tanstack/react-query, @tanstack/react-router - data + routing backbone

## Configuration

**Environment:**
- Backend reads env vars via `std::env::var` / dotenvy. Required: `DATABASE_URL`, `JWT_SECRET`. Optional/defaulted: `ROCKET_PORT`, `ROCKET_ADDRESS`, `RUST_LOG`, and MinIO vars (see INTEGRATIONS.md).
- Frontend reads Vite env: `VITE_API_URL` (default `http://localhost:15520`, in `frontend/src/lib/api.ts`), `VITE_WS_URL` (default `ws://localhost:15540`, in `frontend/src/contexts/websocket-context.tsx`).
- `.env` files present at runtime but not committed; never read contents.

**Build:**
- Backend: `backend/Cargo.toml`. Release profile tuned: `opt-level = 3`, `lto = true`, `codegen-units = 1`.
- Frontend: `frontend/vite.config.ts`, `frontend/tsconfig*.json`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/eslint.config.js`.
- Docker: `backend/Dockerfile`, `frontend/Dockerfile` (used by `docker-compose.yml` `full` profile).

## Platform Requirements

**Development (ports):**
- Frontend 15510, Backend HTTP 15520, PostgreSQL 15530, WebSocket 15540.
- `docker compose -f docker-compose.dev.yml up -d` runs PostgreSQL 15 (alpine) only; backend + frontend run natively.

**Production:**
- `docker-compose.yml` (`full` profile) builds and runs postgres + backend + frontend on the `janus2-network` bridge. Backend container listens on 8000 (mapped to 15520), frontend on 3000 (mapped to 15510).

---

*Stack analysis: 2026-06-23*
