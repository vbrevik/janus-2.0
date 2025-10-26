# Janus 2.0 - System Architecture

## Document Purpose

This document defines the **simplified, pragmatic architecture** for Janus 2.0. Every architectural decision is justified by **real needs**, not theoretical flexibility.

---

## 1. **Architecture Philosophy**

### 1.1 Core Principles

**"The simplest thing that could possibly work"**

1. **Direct over Abstract** - Query database directly, no Repository pattern
2. **Standard over Custom** - Use framework features, no custom DI containers
3. **Flat over Layered** - Minimize layers between request and response
4. **Explicit over Implicit** - Clear code > clever abstractions
5. **Fast over Flexible** - Optimize for performance, add flexibility when needed

### 1.2 What We're NOT Building

❌ **Not building**:
- Custom dependency injection containers
- Repository/Service/Controller layers
- Abstract base classes for everything
- Complex event systems
- Microservices (monolith first)
- Message queues (direct calls first)
- Service mesh
- GraphQL (REST is sufficient)

---

## 2. **System Overview**

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                    │
│                  React + TypeScript + Vite                 │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │   Services   │     │
│  │  (Routes)    │  │  (shadcn/ui) │  │  (API calls) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JSON)
                       │ JWT Authentication
┌──────────────────────▼──────────────────────────────────────┐
│                    Backend (Port 8000)                      │
│                     Rust + Rocket/Actix                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Routes     │  │   Handlers   │  │  Middleware  │     │
│  │ (Endpoints)  │  │  (Business)  │  │ (Auth, CORS) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQLx (Compile-time checked)
┌──────────────────────▼──────────────────────────────────────┐
│                  PostgreSQL (Port 5432)                     │
│                    Database Layer                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Tables     │  │   Indexes    │  │   Triggers   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Key Architectural Decisions

| Decision | Rationale | Alternative Rejected |
|----------|-----------|---------------------|
| **Monolith** | Simpler deployment, faster development | Microservices (premature) |
| **REST API** | Simple, well-understood, sufficient | GraphQL (over-complex) |
| **Direct SQL** | Fast, type-safe with SQLx | Repository pattern (over-abstract) |
| **JWT Auth** | Stateless, scalable | Session-based (requires Redis) |
| **PostgreSQL** | Proven, feature-rich | MongoDB (not transactional) |
| **Docker** | Consistent deployment | Native (environment differences) |

---

## 3. **Backend Architecture**

### 3.1 Directory Structure

```
backend/
├── src/
│   ├── main.rs              # Application entry point
│   ├── config.rs            # Configuration management
│   ├── db.rs                # Database connection
│   │
│   ├── auth/                # Authentication module
│   │   ├── mod.rs           # Module definition
│   │   ├── handlers.rs      # Login, logout endpoints
│   │   ├── jwt.rs           # JWT creation/validation
│   │   └── middleware.rs    # Auth middleware
│   │
│   ├── personnel/           # Personnel module
│   │   ├── mod.rs
│   │   ├── handlers.rs      # CRUD endpoints
│   │   ├── models.rs        # Data models
│   │   └── queries.rs       # SQL queries
│   │
│   ├── vendors/             # Vendor module
│   │   ├── mod.rs
│   │   ├── handlers.rs
│   │   ├── models.rs
│   │   └── queries.rs
│   │
│   ├── access/              # Access control module
│   │   ├── mod.rs
│   │   ├── handlers.rs
│   │   ├── models.rs
│   │   └── queries.rs
│   │
│   ├── audit/               # Audit logging module
│   │   ├── mod.rs
│   │   ├── handlers.rs
│   │   └── queries.rs
│   │
│   └── shared/              # Shared utilities
│       ├── mod.rs
│       ├── errors.rs        # Error types
│       ├── responses.rs     # Response formats
│       └── validation.rs    # Input validation
│
├── migrations/              # Database migrations
│   ├── 001_initial.sql
│   ├── 002_personnel.sql
│   └── ...
│
├── tests/                   # Integration tests
│   ├── auth_test.rs
│   ├── personnel_test.rs
│   └── ...
│
├── Cargo.toml              # Dependencies
└── Dockerfile              # Production image
```

### 3.2 Handler Pattern (No Layers!)

**Direct and Simple** - Query database directly in handlers:

```rust
// src/personnel/handlers.rs

use rocket::{State, get, post, put, delete};
use rocket::serde::json::Json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthGuard;
use crate::personnel::models::{Personnel, CreatePersonnel};
use crate::shared::responses::{ApiResponse, ApiError};

/// Get personnel by ID
#[get("/personnel/<id>")]
pub async fn get_personnel(
    id: Uuid,
    _auth: AuthGuard,  // Requires authentication
    db: &State<PgPool>,
) -> Result<Json<ApiResponse<Personnel>>, ApiError> {
    // Direct database query - no repository layer
    let personnel = sqlx::query_as!(
        Personnel,
        r#"
        SELECT id, first_name, last_name, email, phone, 
               clearance_level, department, position, vendor_id,
               created_at, updated_at, deleted_at
        FROM personnel
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        id
    )
    .fetch_optional(db.inner())
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse::success(personnel)))
}

/// List personnel with pagination
#[get("/personnel?<page>&<limit>")]
pub async fn list_personnel(
    page: Option<i32>,
    limit: Option<i32>,
    _auth: AuthGuard,
    db: &State<PgPool>,
) -> Result<Json<ApiResponse<Vec<Personnel>>>, ApiError> {
    let page = page.unwrap_or(1).max(1);
    let limit = limit.unwrap_or(50).clamp(1, 100);
    let offset = (page - 1) * limit;

    let personnel = sqlx::query_as!(
        Personnel,
        r#"
        SELECT id, first_name, last_name, email, phone,
               clearance_level, department, position, vendor_id,
               created_at, updated_at, deleted_at
        FROM personnel
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit as i64,
        offset as i64
    )
    .fetch_all(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(personnel)))
}

/// Create personnel
#[post("/personnel", data = "<data>")]
pub async fn create_personnel(
    data: Json<CreatePersonnel>,
    auth: AuthGuard,
    db: &State<PgPool>,
) -> Result<Json<ApiResponse<Personnel>>, ApiError> {
    // Validate input
    data.validate()?;

    // Insert into database
    let personnel = sqlx::query_as!(
        Personnel,
        r#"
        INSERT INTO personnel 
        (first_name, last_name, email, phone, clearance_level, 
         department, position, vendor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, first_name, last_name, email, phone,
                  clearance_level, department, position, vendor_id,
                  created_at, updated_at, deleted_at
        "#,
        data.first_name,
        data.last_name,
        data.email,
        data.phone,
        data.clearance_level,
        data.department,
        data.position,
        data.vendor_id
    )
    .fetch_one(db.inner())
    .await?;

    // Log audit event (direct insert, no service layer)
    sqlx::query!(
        r#"
        INSERT INTO audit_log 
        (action, entity_type, entity_id, user_id, changes)
        VALUES ('CREATE', 'personnel', $1, $2, $3)
        "#,
        personnel.id,
        auth.user_id,
        serde_json::to_value(&personnel)?
    )
    .execute(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(personnel)))
}
```

**Why This Works**:
- ✅ **Simple**: One file, one function, clear logic
- ✅ **Fast**: Direct database access, no layers
- ✅ **Type-safe**: SQLx checks queries at compile time
- ✅ **Testable**: Easy to test with test database
- ✅ **Maintainable**: Easy to understand and modify

### 3.3 Authentication & Authorization

**Middleware Pattern** - Not a service layer:

```rust
// src/auth/middleware.rs

use rocket::request::{FromRequest, Outcome, Request};
use rocket::http::Status;
use crate::auth::jwt::verify_token;

pub struct AuthGuard {
    pub user_id: Uuid,
    pub role: String,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthGuard {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        // Extract token from Authorization header
        let token = match req.headers().get_one("Authorization") {
            Some(header) => header.strip_prefix("Bearer ").unwrap_or(""),
            None => return Outcome::Failure((Status::Unauthorized, ())),
        };

        // Verify JWT token
        match verify_token(token) {
            Ok(claims) => Outcome::Success(AuthGuard {
                user_id: claims.user_id,
                role: claims.role,
            }),
            Err(_) => Outcome::Failure((Status::Unauthorized, ())),
        }
    }
}

// Usage: Add AuthGuard parameter to any handler that needs authentication
```

### 3.4 Error Handling

**Simple Error Types** - Not elaborate error hierarchies:

```rust
// src/shared/errors.rs

use rocket::http::Status;
use rocket::response::{Responder, Response};
use std::io::Cursor;

#[derive(Debug)]
pub enum ApiError {
    NotFound,
    Unauthorized,
    Forbidden,
    BadRequest(String),
    ValidationError(String),
    DatabaseError(sqlx::Error),
    InternalError(String),
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, _: &'r rocket::Request<'_>) -> rocket::response::Result<'static> {
        let (status, message) = match self {
            ApiError::NotFound => (Status::NotFound, "Resource not found".to_string()),
            ApiError::Unauthorized => (Status::Unauthorized, "Authentication required".to_string()),
            ApiError::Forbidden => (Status::Forbidden, "Insufficient permissions".to_string()),
            ApiError::BadRequest(msg) => (Status::BadRequest, msg),
            ApiError::ValidationError(msg) => (Status::BadRequest, format!("Validation error: {}", msg)),
            ApiError::DatabaseError(_) => (Status::InternalServerError, "Database error".to_string()),
            ApiError::InternalError(msg) => (Status::InternalServerError, msg),
        };

        let body = serde_json::json!({
            "success": false,
            "error": {
                "message": message,
            },
            "timestamp": chrono::Utc::now().to_rfc3339(),
        });

        Response::build()
            .status(status)
            .header(rocket::http::ContentType::JSON)
            .sized_body(None, Cursor::new(body.to_string()))
            .ok()
    }
}

// Automatic conversion from SQLx errors
impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        ApiError::DatabaseError(err)
    }
}
```

### 3.5 Database Migrations

**Simple SQL Files** - Not elaborate migration frameworks:

```sql
-- migrations/001_initial.sql

-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Personnel table
CREATE TABLE personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    clearance_level VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_personnel_email ON personnel(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_personnel_clearance ON personnel(clearance_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_personnel_vendor ON personnel(vendor_id) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personnel_updated_at
    BEFORE UPDATE ON personnel
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## 4. **Frontend Architecture**

### 4.1 Directory Structure

```
frontend/
├── src/
│   ├── main.tsx             # Entry point
│   ├── App.tsx              # Root component
│   │
│   ├── routes/              # TanStack Router (file-based)
│   │   ├── index.tsx        # Home page
│   │   ├── login.tsx        # Login page
│   │   ├── personnel/
│   │   │   ├── index.tsx    # Personnel list
│   │   │   ├── $id.tsx      # Personnel detail
│   │   │   └── new.tsx      # Create personnel
│   │   └── vendors/
│   │       ├── index.tsx
│   │       ├── $id.tsx
│   │       └── new.tsx
│   │
│   ├── components/          # Reusable components
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── Layout.tsx       # Main layout
│   │   ├── Navbar.tsx       # Navigation
│   │   └── ...
│   │
│   ├── lib/                 # Utilities
│   │   ├── api.ts           # API client
│   │   ├── auth.ts          # Auth utilities
│   │   └── utils.ts         # Helper functions
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── usePersonnel.ts
│   │   └── ...
│   │
│   └── types/               # TypeScript types
│       ├── api.ts           # API response types
│       ├── personnel.ts
│       └── ...
│
├── public/                  # Static assets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 4.2 API Client (Simple!)

```typescript
// src/lib/api.ts

const API_BASE = 'http://localhost:8000/api';

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data;
  }

  // Personnel
  async getPersonnel(id: string) {
    return this.request('GET', `/personnel/${id}`);
  }

  async listPersonnel(page = 1, limit = 50) {
    return this.request('GET', `/personnel?page=${page}&limit=${limit}`);
  }

  async createPersonnel(data: CreatePersonnelDto) {
    return this.request('POST', '/personnel', data);
  }

  // ... more methods
}

export const api = new ApiClient();
```

### 4.3 React Query Integration

```typescript
// src/hooks/usePersonnel.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePersonnel(id: string) {
  return useQuery({
    queryKey: ['personnel', id],
    queryFn: () => api.getPersonnel(id),
  });
}

export function usePersonnelList(page = 1) {
  return useQuery({
    queryKey: ['personnel', 'list', page],
    queryFn: () => api.listPersonnel(page),
  });
}

export function useCreatePersonnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createPersonnel,
    onSuccess: () => {
      // Invalidate personnel list to refetch
      queryClient.invalidateQueries({ queryKey: ['personnel', 'list'] });
    },
  });
}
```

### 4.4 Component Pattern

```typescript
// src/routes/personnel/index.tsx

import { Link } from '@tanstack/react-router';
import { usePersonnelList } from '@/hooks/usePersonnel';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';

export default function PersonnelListPage() {
  const { data, isLoading, error } = usePersonnelList();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Personnel</h1>
        <Link to="/personnel/new">
          <Button>Add Personnel</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Clearance</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((person) => (
            <TableRow key={person.id}>
              <TableCell>{person.firstName} {person.lastName}</TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{person.clearanceLevel}</TableCell>
              <TableCell>{person.department}</TableCell>
              <TableCell>
                <Link to={`/personnel/${person.id}`}>
                  <Button variant="ghost">View</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 5. **Database Architecture**

### 5.1 Schema Design

**Simple, normalized schema** - No over-normalization:

```
Users (Authentication)
├─ id (UUID, PK)
├─ username (UNIQUE)
├─ email (UNIQUE)
├─ password_hash
├─ role
└─ timestamps

Personnel (Core Entity)
├─ id (UUID, PK)
├─ first_name
├─ last_name
├─ email (UNIQUE)
├─ clearance_level
├─ vendor_id (FK → Vendors)
└─ timestamps, soft_delete

Vendors (Organizations)
├─ id (UUID, PK)
├─ name (UNIQUE)
├─ type
├─ clearance_level
├─ parent_vendor_id (FK → Vendors, for hierarchy)
└─ timestamps, soft_delete

Computer_Access (Access Control)
├─ id (UUID, PK)
├─ personnel_id (FK → Personnel)
├─ system_name
├─ access_level
├─ granted_by (FK → Users)
├─ expires_at
└─ status, timestamps

Data_Access (Access Control)
├─ id (UUID, PK)
├─ personnel_id (FK → Personnel)
├─ data_classification
├─ access_level
├─ granted_by (FK → Users)
├─ expires_at
└─ status, timestamps

Physical_Access (Access Control)
├─ id (UUID, PK)
├─ personnel_id (FK → Personnel)
├─ zone_name
├─ access_level
├─ valid_from
├─ valid_until
├─ granted_by (FK → Users)
└─ status, timestamps

Audit_Log (Compliance)
├─ id (UUID, PK)
├─ action
├─ entity_type
├─ entity_id
├─ user_id (FK → Users)
├─ changes (JSONB)
├─ ip_address
└─ timestamp
```

### 5.2 Indexing Strategy

**Index what's queried** - Not everything:

```sql
-- Personnel indexes (most queried)
CREATE INDEX idx_personnel_email ON personnel(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_personnel_clearance ON personnel(clearance_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_personnel_vendor ON personnel(vendor_id) WHERE deleted_at IS NULL;

-- Access control indexes
CREATE INDEX idx_computer_access_personnel ON computer_access(personnel_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_data_access_personnel ON data_access(personnel_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_physical_access_personnel ON physical_access(personnel_id) WHERE status = 'ACTIVE';

-- Audit log indexes
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
```

---

## 6. **Deployment Architecture**

### 6.1 Container Structure

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: janus
      POSTGRES_USER: janus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U janus"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://janus:${DB_PASSWORD}@postgres:5432/janus
      JWT_SECRET: ${JWT_SECRET}
      RUST_LOG: info
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://backend:8000/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 6.2 Production Deployment

**Single command deployment**:

```bash
# Production
docker-compose up -d

# Development
cargo run          # Backend
npm run dev        # Frontend
```

---

## 7. **Key Decisions Summary**

| Aspect | Decision | Why |
|--------|----------|-----|
| **Backend Language** | Rust | Performance, safety, compile-time checks |
| **Backend Framework** | Rocket/Actix | Simple, fast, type-safe |
| **Database** | PostgreSQL | ACID, mature, feature-rich |
| **ORM** | SQLx | Compile-time checked, no runtime overhead |
| **Authentication** | JWT | Stateless, scalable |
| **Frontend** | React + TypeScript | Modern, type-safe, ecosystem |
| **Routing** | TanStack Router | File-based, type-safe |
| **UI** | shadcn/ui + Tailwind | Beautiful, accessible, customizable |
| **State** | TanStack Query | Server state management |
| **Architecture** | Monolith | Simple, fast development |
| **Deployment** | Docker Compose | Consistent, reproducible |

---

## 8. **What Makes This Architecture Simple**

### 8.1 Compared to Janus 1.0

| Janus 1.0 | Janus 2.0 | Improvement |
|-----------|-----------|-------------|
| 4 layers (Controller → Service → Repository → DB) | 1 layer (Handler → DB) | **75% reduction** |
| Custom DI container (200+ lines) | Framework built-in | **Eliminated** |
| Multiple tool sync (4 tools) | Git only | **Simplified** |
| 10 specialized agents | 5 capable agents | **50% reduction** |
| TypeScript build (2-3 min) | Rust build (< 30 sec) | **6x faster** |
| Complex deployment scripts | `docker-compose up` | **Single command** |
| Mixed tech (Node.js docs, actual) | Consistent (Rust throughout) | **Clear** |

### 8.2 Lines of Code Estimate

| Component | Janus 1.0 | Janus 2.0 | Reduction |
|-----------|-----------|-----------|-----------|
| Backend | ~15,000 lines | ~5,000 lines | **67%** |
| Frontend | ~10,000 lines | ~8,000 lines | **20%** |
| Config/Scripts | ~2,000 lines | ~500 lines | **75%** |
| **Total** | **~27,000 lines** | **~13,500 lines** | **50%** |

---

## 9. **Performance Characteristics**

### 9.1 Expected Performance

| Metric | Target | How Achieved |
|--------|--------|--------------|
| API Response Time | < 50ms (p95) | Direct DB access, Rust speed |
| Backend Build | < 30 sec | Rust incremental compilation |
| Frontend Build | < 10 sec | Vite fast builds |
| Database Query | < 10ms | Proper indexes, optimized queries |
| Memory Usage | < 100MB | Rust memory efficiency |
| Startup Time | < 5 sec | No complex initialization |

---

## Next Steps

1. Read `03-TECHNOLOGY-STACK.md` for detailed technology choices
2. Read `04-DATA-MODEL.md` for complete database schema
3. Read `05-API-DESIGN.md` for API endpoint specifications
4. Begin implementation with backend (per user preference)

