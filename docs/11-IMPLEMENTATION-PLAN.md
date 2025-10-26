# Janus 2.0 - Implementation Plan

## Document Purpose

This document provides a **step-by-step implementation plan** for building Janus 2.0. Follow this plan sequentially for best results.

---

## 1. **Implementation Philosophy**

### 1.1 Guiding Principles

1. **Backend First** - Always implement backend before frontend (per user preference)
2. **One Feature at a Time** - Complete each feature 100% before moving on
3. **Test as You Go** - Write tests alongside implementation
4. **Deploy Early** - Deploy MVP 1 before starting MVP 2
5. **No Mocks** - Real implementation or don't implement

### 1.2 Definition of "Complete"

A feature is **complete** when:
- ✅ Backend implemented and tested (100% coverage)
- ✅ Frontend implemented and tested
- ✅ E2E tests pass
- ✅ Documentation written
- ✅ No TODO comments
- ✅ No mock data

---

## 2. **Phase 0: Setup (Week 0, Days 1-2)**

### 2.1 Repository Setup

**Day 1: Project Structure**

```bash
# Create project
mkdir janus-2.0
cd janus-2.0

# Initialize git
git init
git add README.md
git commit -m "Initial commit"

# Create directory structure
mkdir -p backend frontend docs

# Copy documentation
cp -r janus-2.0-docs/* docs/
```

### 2.2 Backend Setup

**Day 1-2: Rust Backend Scaffold**

```bash
# Create Rust project
cd backend
cargo init --name janus-backend

# Add dependencies to Cargo.toml
```

**Cargo.toml**:
```toml
[package]
name = "janus-backend"
version = "2.0.0"
edition = "2021"

[dependencies]
rocket = { version = "0.5", features = ["json"] }
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "uuid", "chrono", "json"] }
jsonwebtoken = "9.2"
bcrypt = "0.15"
validator = { version = "0.16", features = ["derive"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1.5", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"
log = "0.4"
env_logger = "0.11"

[dev-dependencies]
tokio-test = "0.4"
```

**Directory Structure**:
```
backend/
├── src/
│   ├── main.rs
│   ├── config.rs
│   ├── db.rs
│   ├── auth/
│   ├── personnel/
│   ├── vendors/
│   ├── access/
│   ├── audit/
│   └── shared/
├── migrations/
├── tests/
├── Cargo.toml
└── .env.example
```

### 2.3 Database Setup

**Day 2: PostgreSQL + Migrations**

```bash
# Install sqlx-cli
cargo install sqlx-cli --features postgres

# Start PostgreSQL
docker-compose up -d postgres

# Create database
sqlx database create

# Create first migration
sqlx migrate add initial_schema
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: janus
      POSTGRES_USER: janus
      POSTGRES_PASSWORD: janus_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 2.4 Frontend Setup

**Day 2: React + Vite Scaffold**

```bash
# Create Vite project
cd ../frontend
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install TanStack Router
npm install @tanstack/react-router @tanstack/router-vite-plugin

# Install TanStack Query
npm install @tanstack/react-query

# Install UI dependencies
npm install tailwindcss autoprefixer postcss
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Install form handling
npm install react-hook-form @hookform/resolvers zod

# Install dev dependencies
npm install -D @types/node
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```

**Directory Structure**:
```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

---

## 3. **Phase 1: MVP 1 - Core Foundation (Weeks 1-2)**

### 3.1 Week 1: Backend Core

#### Day 1-2: Database Schema + Authentication

**Tasks**:
1. ✅ Create users table migration
2. ✅ Create personnel table migration
3. ✅ Create vendors table migration
4. ✅ Implement JWT creation/validation
5. ✅ Implement bcrypt password hashing
6. ✅ Create auth middleware

**Deliverables**:
- `migrations/001_users.sql`
- `migrations/002_personnel.sql`
- `migrations/003_vendors.sql`
- `src/auth/jwt.rs`
- `src/auth/middleware.rs`

**Tests**:
```rust
#[test]
fn test_jwt_creation_and_validation() { }

#[test]
fn test_password_hashing() { }

#[test]
fn test_auth_middleware() { }
```

#### Day 3-4: Personnel API

**Tasks**:
1. ✅ Create Personnel model
2. ✅ Implement GET /api/personnel (list with pagination)
3. ✅ Implement GET /api/personnel/:id
4. ✅ Implement POST /api/personnel (create)
5. ✅ Implement PUT /api/personnel/:id (update)
6. ✅ Implement DELETE /api/personnel/:id (soft delete)

**Deliverables**:
- `src/personnel/models.rs`
- `src/personnel/handlers.rs`
- `src/personnel/queries.rs` (if needed)

**Tests**:
```rust
#[test]
fn test_list_personnel() { }

#[test]
fn test_get_personnel_by_id() { }

#[test]
fn test_create_personnel() { }

#[test]
fn test_update_personnel() { }

#[test]
fn test_delete_personnel() { }

#[test]
fn test_pagination() { }
```

#### Day 5: Vendor API

**Tasks**:
1. ✅ Create Vendor model
2. ✅ Implement GET /api/vendors (list)
3. ✅ Implement GET /api/vendors/:id
4. ✅ Implement POST /api/vendors
5. ✅ Implement PUT /api/vendors/:id
6. ✅ Implement DELETE /api/vendors/:id

**Deliverables**:
- `src/vendors/models.rs`
- `src/vendors/handlers.rs`

**Tests**:
- Same as personnel (CRUD + pagination)

### 3.2 Week 2: Frontend Core

#### Day 1-2: Auth + Layout

**Tasks**:
1. ✅ Create login page
2. ✅ Implement auth context/hook
3. ✅ Create main layout with navbar
4. ✅ Implement protected routes
5. ✅ Create API client

**Deliverables**:
- `src/routes/login.tsx`
- `src/hooks/useAuth.ts`
- `src/components/Layout.tsx`
- `src/lib/api.ts`

**Tests**:
```typescript
describe('Login', () => {
  it('should login successfully', async () => { });
  it('should show error on invalid credentials', async () => { });
});
```

#### Day 3-4: Personnel UI

**Tasks**:
1. ✅ Create personnel list page
2. ✅ Create personnel detail page
3. ✅ Create personnel create/edit form
4. ✅ Implement TanStack Query hooks

**Deliverables**:
- `src/routes/personnel/index.tsx`
- `src/routes/personnel/$id.tsx`
- `src/routes/personnel/new.tsx`
- `src/hooks/usePersonnel.ts`

**Tests**:
```typescript
describe('Personnel List', () => {
  it('should display personnel', async () => { });
  it('should paginate correctly', async () => { });
});
```

#### Day 5: Vendor UI

**Tasks**:
1. ✅ Create vendor list page
2. ✅ Create vendor detail page
3. ✅ Create vendor create/edit form

**Deliverables**:
- Similar structure to personnel

#### Day 6-7: E2E Tests + Polish

**Tasks**:
1. ✅ Write E2E tests for critical paths
2. ✅ Fix any bugs found
3. ✅ Polish UI
4. ✅ Write user documentation

**E2E Tests (Playwright)**:
```typescript
test('User can create personnel', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await page.click('a[href="/personnel/new"]');
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  await page.fill('[name="email"]', 'john.doe@example.com');
  await page.selectOption('[name="clearanceLevel"]', 'SECRET');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=John Doe')).toBeVisible();
});
```

### 3.3 MVP 1 Acceptance Criteria

**Checklist before deploying**:
- [ ] All backend tests pass (100% coverage)
- [ ] All frontend tests pass (70%+ coverage)
- [ ] All E2E tests pass
- [ ] API responds < 50ms (p95)
- [ ] Backend builds < 30 seconds
- [ ] Frontend builds < 10 seconds
- [ ] Docker compose deployment works
- [ ] Documentation complete
- [ ] No TODO comments
- [ ] No mock data

---

## 4. **Phase 2: MVP 2 - Access Control (Weeks 3-4)**

### 4.1 Week 3: Backend Access Control

#### Day 1-2: Three-Tier Access Schema

**Tasks**:
1. ✅ Create computer_access table migration
2. ✅ Create data_access table migration
3. ✅ Create physical_access table migration
4. ✅ Create access_cards table migration

**Deliverables**:
- `migrations/004_computer_access.sql`
- `migrations/005_data_access.sql`
- `migrations/006_physical_access.sql`
- `migrations/007_access_cards.sql`

#### Day 3-4: Access Control API

**Tasks**:
1. ✅ Implement POST /api/access/computer (grant)
2. ✅ Implement POST /api/access/data (grant)
3. ✅ Implement POST /api/access/physical (grant)
4. ✅ Implement GET /api/personnel/:id/access (list all)
5. ✅ Implement DELETE /api/access/:type/:id (revoke)

**Deliverables**:
- `src/access/models.rs`
- `src/access/handlers.rs`

**Tests**:
- Grant access (valid)
- Grant access (invalid clearance)
- Revoke access
- List access for personnel

#### Day 5: Audit Logging

**Tasks**:
1. ✅ Create audit_log table migration
2. ✅ Implement audit logging middleware
3. ✅ Implement GET /api/audit (query logs)

**Deliverables**:
- `migrations/008_audit_log.sql`
- `src/audit/middleware.rs`
- `src/audit/handlers.rs`

### 4.2 Week 4: Frontend Access Control

#### Day 1-3: Access Management UI

**Tasks**:
1. ✅ Create access management page
2. ✅ Create grant access form (all three tiers)
3. ✅ Create access card issuance form
4. ✅ Create access revocation dialog

**Deliverables**:
- `src/routes/access/index.tsx`
- `src/routes/access/grant.tsx`
- `src/components/AccessCard.tsx`

#### Day 4-5: Audit & Reports

**Tasks**:
1. ✅ Create audit log viewer
2. ✅ Create compliance reports page
3. ✅ Implement report generation

**Deliverables**:
- `src/routes/audit/index.tsx`
- `src/routes/reports/index.tsx`

#### Day 6-7: E2E Tests + Deploy

**Tasks**:
1. ✅ Write E2E tests for access control
2. ✅ Fix bugs
3. ✅ Deploy MVP 2

### 4.3 MVP 2 Acceptance Criteria

**Checklist before deploying**:
- [ ] All access control APIs work
- [ ] All audit logging works
- [ ] All tests pass
- [ ] Performance targets met
- [ ] Documentation complete

---

## 5. **Phase 3: Polish & Deployment (Weeks 5-6)**

### 5.1 Week 5: Performance & Security

#### Day 1-2: Performance Optimization

**Tasks**:
1. ✅ Profile API endpoints
2. ✅ Optimize slow queries
3. ✅ Add database indexes
4. ✅ Implement caching (if needed)

#### Day 3-4: Security Audit

**Tasks**:
1. ✅ Security code review
2. ✅ Fix any vulnerabilities
3. ✅ Add rate limiting
4. ✅ Add CORS configuration

#### Day 5: Load Testing

**Tasks**:
1. ✅ Load test with k6/Apache Bench
2. ✅ Verify 100 concurrent users
3. ✅ Verify < 50ms response time

### 5.2 Week 6: Documentation & Deployment

#### Day 1-3: Documentation

**Tasks**:
1. ✅ Complete API documentation (OpenAPI)
2. ✅ Write user guide
3. ✅ Write admin guide
4. ✅ Write deployment guide

#### Day 4-5: Production Deployment

**Tasks**:
1. ✅ Create production Docker images
2. ✅ Set up production environment
3. ✅ Deploy to production
4. ✅ Verify everything works

#### Day 6-7: Handoff & Training

**Tasks**:
1. ✅ User training
2. ✅ Admin training
3. ✅ Handoff to operations

---

## 6. **Daily Development Workflow**

### 6.1 Morning Routine (10 minutes)

```bash
# Pull latest changes
git pull

# Check backend
cd backend
cargo test
cargo clippy

# Check frontend
cd ../frontend
npm test

# Start development servers
docker-compose up -d postgres
cd backend && cargo run &
cd frontend && npm run dev &
```

### 6.2 Development Loop

**For each feature**:
1. Read requirements in documentation
2. Write backend test (TDD)
3. Implement backend
4. Test backend
5. Write frontend test
6. Implement frontend
7. Test frontend
8. Write E2E test
9. Run E2E test
10. Commit and push

### 6.3 Evening Routine (5 minutes)

```bash
# Run all tests
cargo test --all
npm test
npm run test:e2e

# Commit work
git add .
git commit -m "feat: [description]"
git push

# Stop services
docker-compose down
```

---

## 7. **Testing Strategy**

### 7.1 Backend Tests (Rust)

**Unit Tests**: In same file as code
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name() {
        // Arrange
        let input = ...;
        
        // Act
        let result = function(input);
        
        // Assert
        assert_eq!(result, expected);
    }
}
```

**Integration Tests**: In `tests/` directory
```rust
#[tokio::test]
async fn test_api_endpoint() {
    let client = create_test_client().await;
    let response = client.get("/api/personnel").dispatch().await;
    assert_eq!(response.status(), Status::Ok);
}
```

### 7.2 Frontend Tests (Vitest + Testing Library)

**Component Tests**:
```typescript
import { render, screen } from '@testing-library/react';
import { PersonnelList } from './PersonnelList';

describe('PersonnelList', () => {
  it('should render personnel', () => {
    render(<PersonnelList />);
    expect(screen.getByText('Personnel')).toBeInTheDocument();
  });
});
```

### 7.3 E2E Tests (Playwright)

**User Journey Tests**:
```typescript
import { test, expect } from '@playwright/test';

test('complete personnel workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // Create personnel
  await page.click('a[href="/personnel/new"]');
  // ... fill form ...
  await page.click('button[type="submit"]');
  
  // Verify created
  await expect(page.locator('text=Personnel created')).toBeVisible();
});
```

---

## 8. **Git Workflow**

### 8.1 Branch Strategy

**Simple Strategy**:
- `main` - Production-ready code
- `feature/*` - Feature branches
- No complex branching

### 8.2 Commit Convention

**Format**: `<type>: <description>`

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvement

**Examples**:
```bash
git commit -m "feat: add personnel CRUD endpoints"
git commit -m "fix: resolve authentication bug"
git commit -m "docs: update API documentation"
git commit -m "test: add E2E tests for login"
```

---

## 9. **Deployment Checklist**

### 9.1 MVP 1 Deployment

**Before deploying**:
- [ ] All tests pass (backend + frontend + E2E)
- [ ] Performance benchmarks met
- [ ] Security audit complete
- [ ] Documentation complete
- [ ] Docker images built
- [ ] Environment variables set
- [ ] Database backup configured
- [ ] Monitoring configured
- [ ] Rollback plan ready

**Deployment Steps**:
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend sqlx migrate run

# Verify health
curl http://localhost:8000/api/health
curl http://localhost:3000

# Monitor logs
docker-compose logs -f
```

### 9.2 Post-Deployment

**After deploying**:
- [ ] Verify all endpoints working
- [ ] Run smoke tests
- [ ] Check monitoring dashboards
- [ ] Notify users
- [ ] Update documentation
- [ ] Create git tag

---

## 10. **Success Metrics Tracking**

### 10.1 During Development

**Track Daily**:
- Backend build time (target: < 30 sec)
- Frontend build time (target: < 10 sec)
- Test coverage (target: 80% backend, 70% frontend)
- API response time (target: < 50ms p95)

### 10.2 At Deployment

**Verify**:
- [ ] All tests pass
- [ ] Performance targets met
- [ ] Security vulnerabilities: 0
- [ ] Documentation complete
- [ ] User training complete

---

## 11. **Risk Mitigation**

### 11.1 Common Risks

| Risk | Mitigation |
|------|------------|
| **Database migration fails** | Test migrations on staging first, have rollback plan |
| **Performance issues** | Load test before deployment, have scaling plan |
| **Security vulnerability** | Security audit before deployment, monitor for CVEs |
| **Data loss** | Automated backups, test recovery process |
| **Deployment failure** | Staged deployment, quick rollback procedure |

### 11.2 Rollback Procedure

```bash
# Stop current version
docker-compose down

# Restore previous version
docker-compose -f docker-compose.prod.yml up -d --rollback

# Restore database (if needed)
psql janus < backups/latest.sql

# Verify
curl http://localhost:8000/api/health
```

---

## 12. **Summary Timeline**

### Week-by-Week

| Week | Phase | Deliverable | Status |
|------|-------|-------------|--------|
| 0 | Setup | Project structure, dependencies | 🔄 Start here |
| 1 | MVP 1 Backend | Auth + Personnel + Vendor APIs | ⏳ |
| 2 | MVP 1 Frontend | Login + Personnel + Vendor UIs | ⏳ |
| 3 | MVP 2 Backend | Three-tier access + Audit | ⏳ |
| 4 | MVP 2 Frontend | Access management + Reports | ⏳ |
| 5 | Polish | Performance + Security | ⏳ |
| 6 | Deploy | Documentation + Production | ⏳ |

### Milestone Dates (Example)

- **Week 2 End**: MVP 1 Complete, testable system
- **Week 4 End**: MVP 2 Complete, full feature set
- **Week 6 End**: Production deployment

---

## Next Steps

1. Read all documentation in `janus-2.0-docs/`
2. Set up development environment (Phase 0)
3. Start MVP 1 implementation (Phase 1)
4. Follow this plan sequentially

**Remember**:
- Backend first (per user preference)
- One feature at a time (complete before moving on)
- Test as you go (TDD approach)
- No mocks, no TODOs (complete features only)

---

*Ready to build Janus 2.0! 🚀*

