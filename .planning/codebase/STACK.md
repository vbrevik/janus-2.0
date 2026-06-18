# Technology Stack

**Analysis Date:** 2026-06-18

## Languages

**Primary:**
- Rust 1.87 — backend API server (`backend/`)
- TypeScript 5.9 — frontend SPA (`frontend/src/`)

**Secondary:**
- SQL — database migrations (`backend/migrations/*.sql`)
- HTML — entry points (`frontend/index.html`, `frontend/demo.html`)

## Runtime

**Environment:**
- Backend: Tokio async runtime (via `tokio = { version = "1", features = ["full"] }`)
- Frontend: Browser (ES modules via Vite)

**Package Manager:**
- Backend: Cargo (lockfile: `backend/Cargo.lock`)
- Frontend: npm (lockfile: `frontend/package-lock.json`)

## Frameworks

**Backend:**
- Rocket 0.5 — HTTP web framework (`rocket = { version = "0.5", features = ["json"] }`)
- rocket_cors 0.6 — CORS middleware

**Frontend Core:**
- React 19.1 — UI rendering
- TanStack Router 1.133 — file-based routing (`frontend/src/routes/`, generates `frontend/src/routeTree.gen.ts`)
- TanStack Query 5.90 — server state / data fetching
- Vite 7.1 — build tool and dev server (port 15510)

**Styling:**
- Tailwind CSS 3.4 — utility-first CSS
- shadcn/ui (Radix UI components) — component library; `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-icons`
- class-variance-authority 0.7, clsx 2.1, tailwind-merge 3.3 — class composition utilities
- lucide-react 0.548 — icon library

**Forms:**
- react-hook-form 7.65
- @hookform/resolvers 5.2
- zod 4.1 — schema validation

**Testing:**
- Vitest 4.0 — unit test runner (jsdom environment)
- @testing-library/react 16.3 — component testing
- Playwright 1.56 — e2e tests (`frontend/e2e/`)
- jsdom 28.1 — DOM simulation for unit tests

**Build/Dev:**
- @vitejs/plugin-react 5.0 — React fast refresh
- @tanstack/router-vite-plugin 1.133 — auto-generates route tree
- typescript-eslint 8.45 + eslint 9.36 — linting (flat config, no Prettier)

## Key Dependencies

**Critical (Backend):**
- `sqlx 0.7` (features: postgres, uuid, chrono, json, runtime-tokio-native-tls) — async database queries; inline SQL in `r#"..."#` blocks
- `jsonwebtoken 9.2` — JWT creation and verification (`backend/src/auth/jwt.rs`)
- `bcrypt 0.15` — password hashing
- `tokio-tungstenite 0.21` — WebSocket server (port 15540)
- `validator 0.16` — request struct validation via derive macros
- `uuid 1.5` (v4) — primary key generation
- `chrono 0.4` — timestamps with serde support
- `s3-tokio 0.39` (package alias `s3`) — MinIO/S3 object storage client (`backend/src/document_references/handlers.rs`)
- `serde 1.0` + `serde_json 1.0` — serialization
- `dotenvy 0.15` — `.env` file loading
- `env_logger 0.11` — structured logging

## Configuration

**Environment:**
- Backend: `backend/.env` file (loaded via dotenvy); required vars include `DATABASE_URL`, `JWT_SECRET`
- Frontend: `VITE_API_URL` env var; defaults to `http://localhost:15520` (`frontend/src/lib/api.ts:3`)

**Build:**
- `frontend/vite.config.ts` — Vite config; path alias `@` → `src/`; multiple entry points (`index.html`, `demo.html`)
- `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json` — TypeScript config (strict mode, `noUnusedLocals`, `noUnusedParameters`)
- `frontend/components.json` — shadcn/ui component configuration
- `backend/Cargo.toml` — release profile with LTO and `opt-level = 3`

## Platform Requirements

**Development:**
- Docker (for PostgreSQL container on port 15530)
- Rust 1.87+
- Node.js (npm)
- PostgreSQL 15 (via Docker image `postgres:15-alpine`)

**Production:**
- Backend: native Rust binary
- Frontend: static files from `vite build` (produces `frontend/dist/`)
- PostgreSQL database
- Optional: MinIO or S3-compatible object storage for document references

---

*Stack analysis: 2026-06-18*
