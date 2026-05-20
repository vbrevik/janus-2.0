# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- Rust (edition 2021) - Backend API server (`backend/src/`)
- TypeScript ~5.9.3 - Frontend SPA (`frontend/src/`)

**Secondary:**
- SQL - Database migrations (`backend/migrations/`)
- Nginx config - Production frontend serving (`frontend/nginx.conf`)

## Runtime

**Backend:**
- Rust 1.87 (minimum, per Dockerfile `FROM rust:1.87-slim`)
- Async runtime: Tokio 1.x (`backend/Cargo.toml`)

**Frontend:**
- Node.js 20 (per Dockerfile `FROM node:20-alpine`)
- No `.nvmrc` or `.node-version` file present — Node version enforced only via Docker

## Package Manager

**Frontend:**
- npm with `package-lock.json` (lockfile v3, `frontend/package-lock.json`)
- Lockfile: present

**Backend:**
- Cargo with `Cargo.lock` (`backend/Cargo.lock`)
- Lockfile: present

## Frameworks

**Core (Backend):**
- Rocket 0.5 (features: json) - HTTP web framework (`backend/Cargo.toml`)
- rocket_cors 0.6 - CORS middleware

**Core (Frontend):**
- React 19.1.1 - UI library (`frontend/package.json`)
- TanStack Router 1.133.x - Type-safe file-based routing (`frontend/src/routes/`)
- TanStack Query 5.90.x - Server state management / data fetching

**UI:**
- shadcn/ui (new-york style) - Component library built on Radix UI (`frontend/src/components/ui/`)
  - Components installed: button, badge, card, checkbox, dialog, dropdown-menu, input, label, select, table
  - Config: `frontend/components.json`
- Radix UI primitives - `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-icons`
- Tailwind CSS 3.4.x - Utility-first styling with CSS variables (`frontend/tailwind.config.js`)
- lucide-react 0.548 - Icon set
- class-variance-authority + clsx + tailwind-merge - Component variant utilities

**Forms & Validation:**
- react-hook-form 7.65 - Form state management
- zod 4.1.12 - Schema validation
- @hookform/resolvers 5.2 - Bridge between react-hook-form and zod

**Testing:**
- Vitest 4.0.x - Unit/component test runner (`frontend/vite.config.ts` test config)
- @testing-library/react 16.x - React component testing
- @testing-library/jest-dom 6.x - DOM matchers
- jsdom 28.x - DOM environment for tests
- Playwright 1.56.x - E2E testing (`frontend/playwright.config.ts`)

**Build/Dev (Frontend):**
- Vite 7.1.7 - Dev server and bundler (`frontend/vite.config.ts`)
- @vitejs/plugin-react 5.0 - React Fast Refresh support
- @tanstack/router-vite-plugin - Auto-generates route tree from `src/routes/` filesystem

## Key Dependencies

**Critical (Backend):**
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

**Critical (Frontend):**
- @tanstack/react-router - File-based routing with auto-generated tree (`frontend/src/routeTree.gen.ts`)
- @tanstack/react-query - Data fetching and cache (`frontend/src/hooks/`)
- @tanstack/react-router-devtools - DevTools overlay in development

**Infrastructure:**
- log 0.4 + env_logger 0.11 - Logging facade and implementation
- futures-util 0.3 - Async stream utilities for WebSocket

## Configuration

**Environment (Backend):**
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

**Environment (Frontend):**
- `VITE_API_URL` - Backend HTTP base URL (default: `http://localhost:15520`)
- `VITE_WS_URL` - WebSocket URL (default: `ws://localhost:15540`)
- Set at build time or via Docker environment

**Build:**
- `frontend/vite.config.ts` - Vite config with path alias `@` → `./src`
- `frontend/tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` - TypeScript project references
- `frontend/tailwind.config.js` - Tailwind with shadcn/ui CSS variable tokens
- `frontend/postcss.config.js` - PostCSS with autoprefixer
- `frontend/eslint.config.js` - ESLint 9 flat config with typescript-eslint + react-hooks + react-refresh
- `backend/Cargo.toml` - Release profile: `opt-level=3`, `lto=true`, `codegen-units=1`

## Platform Requirements

**Development:**
- Docker + Docker Compose for PostgreSQL (`docker-compose.dev.yml` — DB only)
- Native Rust toolchain for backend dev
- Node 20 + npm for frontend dev
- Backend dev server: `localhost:15520` (HTTP), `localhost:15540` (WebSocket)
- Frontend dev server: `localhost:15510`
- PostgreSQL: `localhost:15530`

**Production:**
- Docker Compose full profile (`docker-compose.yml` with `--profile full`)
- PostgreSQL 15 Alpine container
- Backend: Rocket in Debian slim container
- Frontend: nginx Alpine serving Vite-built static files on port 3000
- Ports: 15510 (frontend), 15520 (backend API), 15530 (postgres), 15540 (WebSocket)

---

*Stack analysis: 2026-05-20*
