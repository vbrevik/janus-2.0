# External Integrations

**Analysis Date:** 2026-06-18

## APIs & External Services

**Object Storage:**
- MinIO / S3-compatible storage — document reference file storage
  - SDK/Client: `s3-tokio 0.39` (Cargo alias `s3`) in `backend/src/document_references/handlers.rs`
  - Auth: S3 credentials via env vars (not confirmed — see `backend/.env`)
  - Note: Cargo.toml comment says "compatible with Rust 1.86+"; originally intended MinIO

## Data Storage

**Databases:**
- PostgreSQL 15
  - Dev container: `postgres:15-alpine`, host port 15530
  - Connection: `DATABASE_URL` env var in `backend/.env`
  - Client: `sqlx 0.7` with compile-time query checking; raw SQL in `r#"..."#` blocks
  - Migrations: `backend/migrations/` — WARNING: migrations are broken on a fresh DB (ALTER-before-CREATE, duplicate versions); see project memory

**File Storage:**
- MinIO/S3 (see Object Storage above)

**Caching:**
- None — no Redis or in-memory caching layer detected

## Authentication & Identity

**Auth Provider:**
- Custom (self-hosted)
  - JWT-based: `jsonwebtoken 9.2` for token creation/verification (`backend/src/auth/jwt.rs`)
  - Password hashing: `bcrypt 0.15`
  - Tokens stored in `localStorage` on frontend (`frontend/src/lib/api.ts:21`)
  - Bearer token injected in every `Authorization` header via `apiFetch`
  - Backend guard: `AuthGuard` request guard on all non-login handlers (`backend/src/auth/middleware.rs`)
  - RBAC: `backend/src/shared/rbac.rs`; roles enforced server-side; frontend role check via `ProtectedRoute` (`frontend/src/components/ProtectedRoute.tsx`)

## Real-Time / WebSocket

**WebSocket Server:**
- Custom Tokio WebSocket server on port 15540
  - Implementation: `tokio-tungstenite 0.21` + `futures-util 0.3`
  - Location: spawned from `backend/src/shared/rocket_setup.rs`
  - Frontend: `WebSocketContext` in `frontend/src/` (mounted in `routes/__root.tsx`)
  - Known issue: server rejects auth and triggers frontend reconnect flood — documented in `CLAUDE.md`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or equivalent)

**Logs:**
- Backend: `env_logger 0.11` + `log 0.4`; enabled via `RUST_LOG=info` env var
- Frontend: `console.*` only; no structured logging library

## CI/CD & Deployment

**Hosting:**
- Not confirmed in codebase — no Vercel/Railway/Fly config detected

**CI Pipeline:**
- None detected — no `.github/workflows/`, `.gitlab-ci.yml`, or similar

**Containers:**
- `docker-compose.dev.yml` — PostgreSQL only for dev; backend and frontend run natively
- `docker-compose.yml` — full stack container config (backend + frontend + postgres)

## Environment Configuration

**Required env vars (backend):**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for signing JWTs
- Additional S3/MinIO vars likely needed for document references (not confirmed without reading `.env`)

**Required env vars (frontend):**
- `VITE_API_URL` — backend base URL (default: `http://localhost:15520`)

**Secrets location:**
- `backend/.env` — dev secrets (gitignored)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## OpenAPI

- `docs/openapi.json` — OpenAPI spec document; manually maintained (not auto-generated from Rocket routes)

---

*Integration audit: 2026-06-18*
