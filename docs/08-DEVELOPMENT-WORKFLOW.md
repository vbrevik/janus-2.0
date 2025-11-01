# Janus 2.0 - Development Workflow

## Document Purpose

This document describes the development process, tools, and workflows for Janus 2.0.

---

## Development Philosophy

**"Backend First, Complete Features, Test as You Go"**

1. **Backend First** - Always implement backend before frontend
2. **Complete Features** - No mock data, no TODO comments
3. **Test as You Go** - Write tests alongside implementation
4. **Simple Solutions** - Direct over abstract

---

## Daily Development Workflow

### Morning Setup (5 minutes)

```bash
# Start database
docker-compose up -d postgres

# Start backend (if needed)
cd backend && cargo run &

# Start frontend (if needed)
cd frontend && npm run dev &
```

### During Development

**Backend**:
```bash
cd backend
cargo build          # Compile
cargo test           # Run tests
cargo clippy         # Lint check
cargo run            # Run server
```

**Frontend**:
```bash
cd frontend
npm run dev          # Dev server
npm test             # Run tests
npm run test:e2e     # E2E tests
npm run build        # Production build
```

### Evening Routine (5 minutes)

```bash
# Run all tests
cd backend && cargo test
cd ../frontend && npm test && npm run test:e2e

# Check for warnings
cd backend && cargo clippy

# Commit work
git add .
git commit -m "feat: description"
git push
```

---

## Feature Implementation Workflow

### Step 1: Backend Implementation

1. **Create Migration** (if needed):
   ```bash
   cd backend
   sqlx migrate add <description>
   ```

2. **Define Models** (`src/<feature>/models.rs`):
   - Data structures
   - Request/Response types

3. **Implement Handlers** (`src/<feature>/handlers.rs`):
   - CRUD operations
   - Validation
   - Error handling

4. **Mount Routes** (`src/main.rs`):
   - Add module
   - Mount routes

5. **Write Tests**:
   - Unit tests in handler files
   - Integration tests in `tests/`

### Step 2: Frontend Implementation

1. **Define Types** (`src/types/<feature>.ts`):
   - TypeScript interfaces
   - Request/Response types

2. **Create Hooks** (`src/hooks/use-<feature>.ts`):
   - TanStack Query hooks
   - Query keys pattern

3. **Create Route** (`src/routes/<feature>/index.tsx`):
   - List page
   - CRUD operations
   - UI components

4. **Add Navigation** (`src/components/layout.tsx`):
   - Add nav link

### Step 3: Testing

1. **Manual Testing**:
   - Test all CRUD operations
   - Test error cases
   - Test edge cases

2. **E2E Tests** (`e2e/<feature>.spec.ts`):
   - Critical user journeys
   - Playwright tests

---

## Git Workflow

### Branch Strategy

- **`main`** - Production-ready code
- **`feature/*`** - Feature branches
- **No complex branching** - Simple workflow

### Commit Convention

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
git commit -m "feat: add roles & permissions management"
git commit -m "fix: resolve authentication bug"
git commit -m "docs: update API documentation"
```

---

## Code Quality

### Backend (Rust)

**Linting**:
```bash
cargo clippy -- -D warnings
```

**Formatting**:
```bash
cargo fmt
```

**Testing**:
```bash
cargo test --all
```

### Frontend (TypeScript)

**Linting**:
```bash
npm run lint
```

**Type Checking**:
```bash
npm run type-check
```

**Formatting**:
```bash
npm run format
```

---

## Debugging

### Backend

**Logs**:
```bash
# Run with logging
RUST_LOG=debug cargo run

# Or check logs file
tail -f /tmp/janus-backend.log
```

**Database Queries**:
- Enable SQLx logging: `RUST_LOG=sqlx=debug`

### Frontend

**Browser DevTools**:
- React DevTools extension
- Network tab for API calls
- Console for errors

**API Debugging**:
- Check `lib/api.ts` for request/response logging
- Use browser network inspector

---

## Tools & Dependencies

### Backend
- **Cargo** - Package manager
- **SQLx CLI** - Migration tool
- **cargo-watch** - Auto-reload (optional)

### Frontend
- **npm/pnpm** - Package manager
- **Vite** - Build tool
- **Playwright** - E2E testing

---

## Performance Targets

- **Backend Build**: < 30 seconds ✅
- **Frontend Build**: < 10 seconds ✅
- **API Response**: < 50ms (p95) ✅
- **Hot Reload**: < 2 seconds ✅

---

## Resources

- **Backend Docs**: `backend/README.md`
- **Frontend Docs**: `frontend/README.md`
- **Testing Guide**: `docs/TESTING-GUIDE.md`
- **Architecture**: `docs/02-ARCHITECTURE.md`

---

**Last Updated**: 2025-01-30

