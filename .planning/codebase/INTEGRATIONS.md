# External Integrations

**Analysis Date:** 2026-06-23

## APIs & External Services

**Internal HTTP API (frontend → backend):**
- Rocket REST API mounted under `/api/*` (`backend/src/shared/rocket_setup.rs`).
  - Client: `frontend/src/lib/api.ts` (`apiFetch`, `api.*`, `ApiError{status}`).
  - Base URL: `VITE_API_URL` or `http://localhost:15520` (WITHOUT `/api`; every endpoint string must start with `/api/...`).
  - Auth: Bearer JWT injected from `localStorage` by the API layer.
- No third-party SaaS APIs (Stripe, etc.) detected.

## Data Storage

**Databases:**
- PostgreSQL 15 (`postgres:15-alpine`)
  - Connection: `DATABASE_URL` env var (e.g. `postgresql://janus:...@postgres:5432/janus2`).
  - Client: sqlx 0.7 `PgPool`, configured in `backend/src/shared/database.rs`; handlers query the pool directly via inline SQL.
  - Schema: migrations in `backend/migrations/` (note: chain does not build cleanly on a fresh DB — ALTER-before-CREATE, duplicate versions, zombie rename migrations; live dev DB drifts from code).

**File Storage:**
- MinIO / S3-compatible object storage (`backend/src/document_references/handlers.rs`)
  - Client: `s3-tokio` 0.39 (`Bucket`, `Region`, `Credentials`).
  - Config (env, with defaults): `MINIO_ACCESS_KEY` (default `janusminio`), `MINIO_SECRET_KEY` (default `janusminio_password`), `MINIO_BUCKET` (default `janus-documents`), `MINIO_ENDPOINT`, `MINIO_REGION`.
  - Object paths stored as `s3://<bucket>/<key>` on document-reference attachments.
  - NOTE: MinIO is not declared in either docker-compose file — it must be provided externally in environments that use document attachments.

**Caching:**
- None detected.

## Authentication & Identity

**Auth Provider:**
- Custom JWT auth (no external IdP).
  - Issuance/verification: jsonwebtoken 9.2 signed with `JWT_SECRET`.
  - Passwords: bcrypt 0.15.
  - Enforcement: `AuthGuard` Bearer-JWT request guard on every non-login handler (`backend/src/shared/auth/middleware.rs`).
  - Authorization: role-based via `backend/src/shared/rbac.rs`; frontend canonical guard `ProtectedRoute` with `allowedRoles` (`frontend/src/components/ProtectedRoute.tsx`).
  - Token storage (frontend): JWT in `localStorage` via `AuthContext` (`auth-context.tsx`).
  - Seed users (password `password123`): `admin`, `manager`, `operator`, `viewer` (+ enduser/official seed migration `20260601120200`).

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/external tracker).

**Logs:**
- Backend: `log` + `env_logger`, level via `RUST_LOG` (e.g. `info`). WebSocket server failures printed to stderr.
- Frontend: console; no structured logging.

## CI/CD & Deployment

**Hosting:**
- Docker Compose (`docker-compose.yml`, `full` profile) — postgres + backend + frontend on the `janus2-network` bridge. Built from `backend/Dockerfile` and `frontend/Dockerfile`.

**CI Pipeline:**
- None detected (no `.github/workflows`, etc.).

## Environment Configuration

**Required env vars:**
- Backend: `DATABASE_URL`, `JWT_SECRET` (min 32 chars in prod).
- Backend optional/defaulted: `ROCKET_PORT`, `ROCKET_ADDRESS`, `RUST_LOG`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_ENDPOINT`, `MINIO_REGION`.
- Frontend: `VITE_API_URL`, `VITE_WS_URL`.

**Secrets location:**
- `.env` files (uncommitted; loaded via dotenvy). `docker-compose.yml` inlines a development `JWT_SECRET` and DB password — must be overridden for production.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

## Realtime / WebSocket

- Standalone WebSocket server on port 15540 (tokio-tungstenite), spawned separately from Rocket in `backend/src/shared/rocket_setup.rs` (`messaging::websocket::WebSocketManager`).
- Frontend client: `frontend/src/hooks/use-websocket.ts`, provided via `WebSocketContext` (`frontend/src/contexts/websocket-context.tsx`), URL `VITE_WS_URL` / `ws://localhost:15540`.
- KNOWN ISSUE: the WS server rejects auth, causing the frontend reconnect loop to flood the console; ignored in tests.

---

*Integration audit: 2026-06-23*
