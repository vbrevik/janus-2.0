# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

**Object Storage:**
- MinIO (S3-compatible) - Document attachment storage for `document_references`
  - SDK/Client: `s3-tokio` crate aliased as `s3` (`backend/Cargo.toml`)
  - Usage: `backend/src/document_references/handlers.rs` — `upload_document_attachment` handler
  - Auth env vars: `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
  - Endpoint env var: `MINIO_ENDPOINT` (default: `http://localhost:9000`)
  - Bucket env var: `MINIO_BUCKET` (default: `janus-documents`)
  - Files stored with path-style access under key: `document_references/{id}/{filename}`
  - Stored path format in DB: `s3://{bucket}/{key}`

## Data Storage

**Databases:**
- PostgreSQL 15 (Alpine)
  - Connection env var: `DATABASE_URL` (e.g., `postgresql://janus:password@postgres:5432/janus2`)
  - Client: sqlx 0.7 with compile-time query verification
  - Pool: `PgPoolOptions` with `max_connections(10)` (`backend/src/shared/rocket_setup.rs`)
  - Database name: `janus2`, default user: `janus`
  - Migrations: 20 SQL migration files in `backend/migrations/` applied via sqlx
  - Host port (dev): 15530 mapped to container 5432

**File Storage:**
- MinIO object storage (see APIs section above)
- Attachments are base64-encoded in upload requests, decoded server-side and streamed to MinIO

**Caching:**
- None — no Redis, Memcached, or in-memory caching layer detected
- TanStack Query handles client-side cache on the frontend

## Authentication & Identity

**Auth Provider:**
- Custom (no third-party auth provider)
  - Implementation: `backend/src/auth/` — handlers, jwt, middleware, models
  - Login endpoint: `POST /auth/login` — validates username/password, returns JWT
  - JWT signing: HMAC HS256 via `jsonwebtoken` crate (`backend/src/auth/jwt.rs`)
  - Token lifetime: 8 hours (hardcoded in `backend/src/auth/jwt.rs`)
  - JWT claims: `sub` (person_id as string), `exp`, `iat`, `role`
  - Secret env var: `JWT_SECRET` (must be ≥32 characters)
  - Password hashing: bcrypt (`backend/src/auth/handlers.rs`, `backend/src/person/handlers.rs`)
  - Token transport: `Authorization: Bearer <token>` header
  - Token storage (frontend): `localStorage` key `token` (`frontend/src/lib/api.ts`)
  - User storage (frontend): `localStorage` key `user` as JSON (`frontend/src/contexts/auth-context.tsx`)
  - Auth guard: `AuthGuard` Rocket request guard (`backend/src/auth/middleware.rs`)
  - Roles: `admin`, `enduser`, `official` — enforced in JWT claim `role`

## Real-Time / WebSocket

**WebSocket Server:**
- Custom implementation using `tokio-tungstenite` 0.21
  - Server launched as a Tokio task on startup (`backend/src/shared/rocket_setup.rs`)
  - Bind address: `0.0.0.0:15540` (separate port from HTTP API)
  - Manager: `WebSocketManager` — in-memory connection map keyed by `user_id: i32` (`backend/src/messaging/websocket.rs`)
  - Auth: JWT validated on WebSocket handshake
  - DB access: `PgPool` shared with HTTP server
  - Frontend client: `useWebSocket` hook + `WebSocketProvider` context (`frontend/src/contexts/websocket-context.tsx`)
  - Frontend env var: `VITE_WS_URL` (default: `ws://localhost:15540`)
  - Auto-reconnect enabled on frontend

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar service detected

**Logs:**
- Backend: `env_logger` with `RUST_LOG` env var control (e.g., `RUST_LOG=info`)
  - Errors emitted via `eprintln!` in handlers (`backend/src/document_references/handlers.rs`)
- Frontend: `console.log` only — no structured logging or log aggregation

## CI/CD & Deployment

**Hosting:**
- Docker Compose (self-hosted or any Docker-capable host)
- Development: `docker-compose.dev.yml` (PostgreSQL only, services run natively)
- Production: `docker-compose.yml` with `--profile full` (all services containerized)

**CI Pipeline:**
- Not detected — no GitHub Actions, CircleCI, or similar config files found

## Environment Configuration

**Required env vars (backend):**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — HMAC signing secret (≥32 chars)

**Optional env vars (backend):**
- `ROCKET_PORT` — HTTP port (default: 8000)
- `ROCKET_ADDRESS` — Bind address (default: configured by Rocket)
- `RUST_LOG` — Log level
- `MINIO_ENDPOINT` — Object storage endpoint
- `MINIO_ACCESS_KEY` — Object storage access key
- `MINIO_SECRET_KEY` — Object storage secret
- `MINIO_BUCKET` — Bucket name
- `MINIO_REGION` — S3 region string

**Required env vars (frontend — build time):**
- `VITE_API_URL` — Backend API base URL
- `VITE_WS_URL` — WebSocket server URL

**Secrets location:**
- `backend/.env` file (present, not committed if following .gitignore)
- Docker Compose inline environment blocks for development (`docker-compose.yml`)

## Webhooks & Callbacks

**Incoming:**
- None detected — no webhook receiver endpoints found

**Outgoing:**
- None detected — no HTTP client calls to external URLs at runtime

## CORS Configuration

- `rocket_cors` 0.6 configured in `backend/src/shared/rocket_setup.rs`
- Allowed origins: all (`AllowedOrigins::all()`)
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Credentials: allowed

---

*Integration audit: 2026-05-20*
