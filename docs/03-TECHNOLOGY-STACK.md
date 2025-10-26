# Janus 2.0 - Technology Stack

## Document Purpose

This document specifies the **exact technologies, versions, and rationale** for every component in Janus 2.0.

---

## 1. **Backend Stack**

### 1.1 Core Language: Rust

**Version**: 1.70+ (stable channel)

**Why Rust**:
- ✅ **Performance**: 10-100x faster than Node.js for CPU-bound tasks
- ✅ **Memory Safety**: No null pointer exceptions, no data races
- ✅ **Compile-Time Guarantees**: Catch bugs before runtime
- ✅ **Type Safety**: Strong static typing without runtime overhead
- ✅ **Ecosystem**: Excellent crates (libraries) for web development
- ✅ **User Preference**: Specified in project requirements

**NOT Node.js/TypeScript because**:
- ❌ Runtime errors (103 TypeScript errors in Janus 1.0)
- ❌ Slower performance (200ms API responses)
- ❌ Complex type system (TypeScript still has runtime surprises)
- ❌ Larger memory footprint

### 1.2 Web Framework: Rocket

**Version**: Rocket 0.5+

**Cargo.toml**:
```toml
[dependencies]
rocket = { version = "0.5", features = ["json"] }
```

**Why Rocket**:
- ✅ **Type-Safe**: Compile-time route checking
- ✅ **Simple API**: Easy to learn and use
- ✅ **Request Guards**: Built-in dependency injection
- ✅ **JSON Support**: Automatic serialization/deserialization
- ✅ **Testing**: Excellent testing support

**Alternative Considered**: Actix-web
- ✅ **Slightly faster** (10-15% better benchmarks)
- ❌ **More complex** (lower-level API, steeper learning curve)
- ❌ **Less ergonomic** (more boilerplate)

**Decision**: Use Rocket for simplicity. Can switch to Actix-web later if performance critical.

### 1.3 Database Driver: SQLx

**Version**: SQLx 0.7+

**Cargo.toml**:
```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "uuid", "chrono", "json"] }
```

**Why SQLx**:
- ✅ **Compile-Time Checking**: Queries checked against actual database schema
- ✅ **Async**: Fully async with Tokio runtime
- ✅ **Type-Safe**: Maps SQL types to Rust types automatically
- ✅ **Migration Support**: Built-in migration tool (sqlx-cli)
- ✅ **No ORM Complexity**: Direct SQL queries, no Repository pattern needed

**NOT Diesel (traditional Rust ORM)**:
- ❌ Synchronous (blocking I/O)
- ❌ Complex DSL for query building
- ❌ Runtime errors instead of compile-time

**NOT SeaORM (async ORM)**:
- ❌ Additional abstraction layer (not needed)
- ❌ Runtime query building
- ❌ More complex for simple queries

### 1.4 Authentication: JWT

**Crate**: jsonwebtoken

**Cargo.toml**:
```toml
[dependencies]
jsonwebtoken = "9.2"
```

**Why JWT**:
- ✅ **Stateless**: No session storage (Redis) needed
- ✅ **Scalable**: Works across multiple server instances
- ✅ **Standard**: Industry-standard authentication
- ✅ **Simple**: Easy to implement and test

**Token Structure**:
```json
{
  "sub": "user-uuid",
  "role": "ADMIN",
  "exp": 1698765432
}
```

### 1.5 Password Hashing: bcrypt

**Crate**: bcrypt

**Cargo.toml**:
```toml
[dependencies]
bcrypt = "0.15"
```

**Why bcrypt**:
- ✅ **Industry Standard**: Proven secure algorithm
- ✅ **Adaptive**: Cost factor can be increased over time
- ✅ **Built-in Salt**: Automatic salt generation

**Configuration**:
- Cost Factor: 12 (2^12 = 4096 iterations)
- Provides good balance between security and performance

**NOT base64** (Janus 1.0 mistake):
- ❌ Not encryption, just encoding
- ❌ Easily reversible
- ❌ Security vulnerability

### 1.6 Validation: validator

**Crate**: validator

**Cargo.toml**:
```toml
[dependencies]
validator = { version = "0.16", features = ["derive"] }
```

**Why validator**:
- ✅ **Derive Macro**: Simple attribute-based validation
- ✅ **Comprehensive**: Email, length, range, custom validators
- ✅ **Clear Errors**: Returns detailed validation errors

**Example**:
```rust
#[derive(Deserialize, Validate)]
struct CreatePersonnel {
    #[validate(length(min = 1, max = 100))]
    first_name: String,
    
    #[validate(email)]
    email: String,
    
    #[validate(phone)]
    phone: Option<String>,
}
```

### 1.7 Serialization: serde

**Crate**: serde + serde_json

**Cargo.toml**:
```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Why serde**:
- ✅ **Zero-Cost**: No runtime overhead
- ✅ **Type-Safe**: Compile-time serialization checking
- ✅ **Flexible**: Supports many formats (JSON, MessagePack, etc.)
- ✅ **Standard**: De facto standard in Rust ecosystem

### 1.8 Async Runtime: Tokio

**Crate**: tokio

**Cargo.toml**:
```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

**Why Tokio**:
- ✅ **Industry Standard**: Most mature Rust async runtime
- ✅ **Performance**: Highly optimized for I/O operations
- ✅ **Ecosystem**: Best ecosystem support
- ✅ **Built-in**: Required by Rocket and SQLx

### 1.9 Complete Backend Dependencies

```toml
[package]
name = "janus-backend"
version = "2.0.0"
edition = "2021"

[dependencies]
# Web framework
rocket = { version = "0.5", features = ["json"] }

# Database
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "uuid", "chrono", "json"] }

# Authentication & Security
jsonwebtoken = "9.2"
bcrypt = "0.15"

# Validation
validator = { version = "0.16", features = ["derive"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Async runtime
tokio = { version = "1", features = ["full"] }

# Utilities
uuid = { version = "1.5", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"

# Logging
log = "0.4"
env_logger = "0.11"

[dev-dependencies]
# Testing
tokio-test = "0.4"
```

**Total Backend Dependencies**: ~15 direct dependencies (vs 40+ in Janus 1.0)

---

## 2. **Frontend Stack**

### 2.1 Core Framework: React

**Version**: React 18+

**Why React**:
- ✅ **Proven**: Industry standard, mature ecosystem
- ✅ **TypeScript Support**: Excellent type safety
- ✅ **Performance**: Virtual DOM, efficient updates
- ✅ **Ecosystem**: Huge library ecosystem
- ✅ **Working Well**: No issues in Janus 1.0

### 2.2 Build Tool: Vite

**Version**: Vite 5+

**Why Vite**:
- ✅ **Fast**: < 10 second builds (vs minutes with Webpack)
- ✅ **HMR**: Instant hot module replacement
- ✅ **Simple Config**: Minimal configuration needed
- ✅ **ES Modules**: Native browser module support
- ✅ **Working Well**: No issues in Janus 1.0

**NOT Webpack**:
- ❌ Slow builds (2-3 minutes in Janus 1.0)
- ❌ Complex configuration
- ❌ Slower HMR

### 2.3 Routing: TanStack Router

**Version**: @tanstack/router 1+

**Why TanStack Router**:
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **File-Based**: Automatic route generation from files
- ✅ **Code Splitting**: Automatic route-based splitting
- ✅ **Search Params**: Type-safe URL search parameters
- ✅ **Working Well**: No issues in Janus 1.0

**NOT React Router**:
- ❌ Less type-safe
- ❌ Manual route configuration
- ❌ No built-in file-based routing

### 2.4 State Management: TanStack Query

**Version**: @tanstack/react-query 5+

**Why TanStack Query**:
- ✅ **Server State**: Specialized for API data
- ✅ **Caching**: Intelligent caching and invalidation
- ✅ **DevTools**: Excellent debugging tools
- ✅ **TypeScript**: Full type inference
- ✅ **Simple**: No complex store setup needed

**NOT Redux**:
- ❌ Over-complex for simple CRUD operations
- ❌ Boilerplate-heavy
- ❌ Not optimized for server state

**NOT Zustand/Jotai** (for client state):
- ✅ Good for local UI state
- ❌ Not needed for Janus 2.0 MVP (TanStack Query sufficient)

### 2.5 UI Library: shadcn/ui

**Version**: Latest

**Why shadcn/ui**:
- ✅ **Copy-Paste**: Components copied to your project, not npm dependency
- ✅ **Customizable**: Full control over component code
- ✅ **Accessible**: WCAG compliant out of the box
- ✅ **Beautiful**: Modern, professional design
- ✅ **Tailwind**: Built with Tailwind CSS
- ✅ **Working Well**: Excellent in Janus 1.0

### 2.6 Styling: Tailwind CSS

**Version**: Tailwind CSS 3+

**Why Tailwind**:
- ✅ **Utility-First**: Fast development
- ✅ **Consistent**: Design system built-in
- ✅ **Small Bundle**: Unused styles purged
- ✅ **Responsive**: Mobile-first approach
- ✅ **Working Well**: No issues in Janus 1.0

**NOT CSS-in-JS** (styled-components, emotion):
- ❌ Runtime overhead
- ❌ Larger bundle size
- ❌ Less performant

### 2.7 Form Handling: React Hook Form

**Version**: react-hook-form 7+

**Why React Hook Form**:
- ✅ **Performance**: Minimal re-renders
- ✅ **TypeScript**: Full type safety
- ✅ **Validation**: Built-in validation support
- ✅ **Simple API**: Easy to use
- ✅ **Working Well**: Good in Janus 1.0

### 2.8 Validation: Zod

**Version**: zod 3+

**Why Zod**:
- ✅ **TypeScript**: Infers types from schema
- ✅ **Runtime**: Runtime validation
- ✅ **Composable**: Easy schema composition
- ✅ **Integration**: Works with React Hook Form

### 2.9 Complete Frontend Dependencies

```json
{
  "name": "janus-frontend",
  "version": "2.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-router": "^1.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@tanstack/router-vite-plugin": "^1.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "playwright": "^1.40.0"
  }
}
```

**Total Frontend Dependencies**: ~25 direct dependencies (vs 40+ in Janus 1.0)

---

## 3. **Database Stack**

### 3.1 Database: PostgreSQL

**Version**: PostgreSQL 15+

**Why PostgreSQL**:
- ✅ **ACID**: Full transaction support
- ✅ **Mature**: 30+ years of development
- ✅ **Feature-Rich**: JSON, full-text search, arrays, etc.
- ✅ **Performance**: Excellent for read-heavy workloads
- ✅ **Extensions**: PostGIS, pg_trgm, etc.
- ✅ **Working Well**: Successful migration in Janus 1.0

**NOT SQLite** (development only):
- ❌ Not production-ready for concurrent writes
- ❌ Limited type system
- ❌ No user management

**NOT MongoDB**:
- ❌ No transactions (until recently)
- ❌ No referential integrity
- ❌ Not suitable for relational data

### 3.2 Migration Tool: sqlx-cli

**Installation**:
```bash
cargo install sqlx-cli --features postgres
```

**Why sqlx-cli**:
- ✅ **Simple**: SQL files, no DSL
- ✅ **Version Control**: Migrations in git
- ✅ **Rollback**: Support for up/down migrations
- ✅ **Integrated**: Works seamlessly with SQLx

**Usage**:
```bash
# Create migration
sqlx migrate add create_users_table

# Run migrations
sqlx migrate run

# Revert migration
sqlx migrate revert
```

---

## 4. **Development Tools**

### 4.1 Version Control: Git

**Why Git**:
- ✅ **Standard**: Industry standard
- ✅ **Single Source of Truth**: No multiple tools to sync
- ✅ **History**: Complete project history

**NOT**:
- ❌ Linear + Pieces LTM + scratchpad + notebook (too many tools)

### 4.2 Testing: Playwright

**Version**: Playwright 1.40+

**Why Playwright**:
- ✅ **Modern**: Best E2E testing tool
- ✅ **Fast**: Parallel execution
- ✅ **Reliable**: Auto-wait for elements
- ✅ **Multi-Browser**: Chrome, Firefox, Safari
- ✅ **User Preference**: Specified in requirements

**NOT Selenium**:
- ❌ Slower
- ❌ Flaky tests
- ❌ More complex setup

### 4.3 API Testing: Built-in Rust Tests

**Why Rust Integration Tests**:
- ✅ **Fast**: Compile-time checking
- ✅ **Type-Safe**: Full type checking
- ✅ **Built-in**: No additional tools needed

**Example**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use rocket::local::blocking::Client;
    use rocket::http::Status;

    #[test]
    fn test_get_personnel() {
        let client = Client::tracked(rocket()).unwrap();
        let response = client.get("/api/personnel/123").dispatch();
        assert_eq!(response.status(), Status::Ok);
    }
}
```

### 4.4 Linting & Formatting

**Backend**:
- **rustfmt**: Code formatting (built-in)
- **clippy**: Linting (built-in)

**Frontend**:
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting

---

## 5. **Deployment Stack**

### 5.1 Containerization: Docker

**Version**: Docker 24+

**Why Docker**:
- ✅ **Consistency**: Same environment everywhere
- ✅ **Isolation**: No dependency conflicts
- ✅ **Standard**: Industry standard
- ✅ **Mac M2**: Full support for ARM64

### 5.2 Orchestration: Docker Compose

**Version**: Docker Compose 2+

**Why Docker Compose**:
- ✅ **Simple**: Single file configuration
- ✅ **Multi-Container**: Manage all services
- ✅ **Development**: Great for local development
- ✅ **Production**: Good for simple production deployments

**NOT Kubernetes**:
- ❌ Over-complex for MVP
- ❌ Requires additional infrastructure
- ❌ Can add later if needed

---

## 6. **Monitoring & Logging**

### 6.1 Logging: env_logger

**Why env_logger**:
- ✅ **Built-in**: Standard Rust logging
- ✅ **Configurable**: Environment variable config
- ✅ **Simple**: No complex setup

**Configuration**:
```bash
RUST_LOG=info cargo run          # Info and above
RUST_LOG=debug cargo run         # Debug and above
RUST_LOG=janus_backend=trace     # Trace for specific module
```

### 6.2 Health Checks: Built-in Endpoint

**Endpoint**: `/api/health`

**Response**:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "connected",
  "uptime": 12345
}
```

---

## 7. **Technology Constraints**

### 7.1 Mac M2 Compatibility

**All technologies MUST**:
- ✅ Support ARM64 architecture natively
- ✅ Have Docker images for ARM64
- ✅ Build without Rosetta 2 emulation

**Verified Compatible**:
- ✅ Rust (native ARM64)
- ✅ Node.js (native ARM64)
- ✅ PostgreSQL (ARM64 Docker image)
- ✅ All dependencies (verified)

### 7.2 Minimum Versions

| Technology | Minimum Version | Reason |
|------------|----------------|--------|
| Rust | 1.70 | Async features |
| Node.js | 20 | ESM support |
| PostgreSQL | 15 | Performance improvements |
| Docker | 24 | Improved M2 support |

---

## 8. **What We're NOT Using**

Based on Janus 1.0 lessons:

| Technology | Why NOT |
|------------|---------|
| **Node.js/Express** | Slower, runtime errors, type issues |
| **Custom DI Container** | Over-complex, framework has it |
| **Repository Pattern** | Unnecessary abstraction |
| **Redux** | Over-complex for CRUD apps |
| **GraphQL** | Over-complex, REST sufficient |
| **Microservices** | Premature, monolith first |
| **Kubernetes** | Over-complex for MVP |
| **Elasticsearch** | Not needed for MVP |
| **Redis** | Not needed (stateless auth) |
| **RabbitMQ** | Not needed (direct calls) |

---

## 9. **Dependency Philosophy**

### 9.1 Principles
1. **Minimize dependencies** - Each dependency is tech debt
2. **Prefer standard libraries** - Over third-party when possible
3. **Choose mature** - Avoid bleeding edge
4. **Avoid abandoned** - Check recent commits
5. **Security** - No known vulnerabilities

### 9.2 Dependency Limits
- **Backend**: < 20 direct dependencies
- **Frontend**: < 30 direct dependencies

**Current Count**:
- Backend: ~15 dependencies ✅
- Frontend: ~25 dependencies ✅

---

## Summary

Janus 2.0 uses a **carefully selected, minimal** technology stack:

**Backend**: Rust + Rocket + SQLx + PostgreSQL  
**Frontend**: React + TypeScript + Vite + TanStack  
**Deployment**: Docker + Docker Compose  
**Testing**: Rust tests + Playwright  

**Total Dependencies**: ~40 (vs 80+ in Janus 1.0)

**Philosophy**: **Standard, proven technologies with minimal dependencies.**

Next: Read `04-DATA-MODEL.md` for database schema details.

