# Janus 2.0 - Quick Start Guide

## 🚀 **Get Started in 5 Minutes**

This is the **fastest path** to understanding and implementing Janus 2.0.

---

## 1. **What is Janus 2.0?**

**Simple security clearance system** for air-gapped environments.

**Core Features**:
- Personnel management with clearance levels
- Organization management with hierarchies
- Three-tier access control (Computer, Data, Physical)
- Complete audit trail

**Technology**: Rust backend + React frontend + PostgreSQL

**Target**: < 30 second builds, < 50ms API responses, production-ready

---

## 2. **Why Janus 2.0 (Not 1.x)?**

Janus 1.0 was **functionally complete** but **over-engineered**:
- ❌ 4 abstraction layers
- ❌ Custom DI containers
- ❌ 103 TypeScript errors
- ❌ 27+ mock data instances
- ❌ 2-3 minute builds

Janus 2.0 fixes all of this:
- ✅ Direct database access (1 layer)
- ✅ Framework built-ins (no custom DI)
- ✅ Rust compile-time safety (no runtime errors)
- ✅ Zero mock data
- ✅ < 30 second builds

**Read this first**: `09-LESSONS-LEARNED.md` (understand what NOT to do)

---

## 3. **Critical Documents (Read in Order)**

### For Understanding (1 hour)
1. **`README.md`** (5 min) - Overview and navigation
2. **`09-LESSONS-LEARNED.md`** (20 min) - ⚠️ **CRITICAL** - What went wrong in 1.0
3. **`00-OVERVIEW.md`** (15 min) - Goals and principles
4. **`01-REQUIREMENTS.md`** (20 min) - What to build

### For Implementation (2 hours)
5. **`02-ARCHITECTURE.md`** (30 min) - How to build it (simple!)
6. **`03-TECHNOLOGY-STACK.md`** (30 min) - Technologies and rationale
7. **`11-IMPLEMENTATION-PLAN.md`** (60 min) - Step-by-step guide

### Reference (as needed)
8. **`04-DATA-MODEL.md`** - Database schema (when implementing)
9. **`05-API-DESIGN.md`** - API endpoints (when implementing)
10. **`06-FRONTEND-STRUCTURE.md`** - React patterns (when implementing)

---

## 4. **The Golden Rules**

### 4.1 What TO Do ✅

1. **Backend First** - Always implement backend before frontend
2. **Direct Queries** - Query database directly in handlers
3. **Complete Features** - 100% complete or don't implement
4. **Test as You Go** - TDD approach, tests alongside code
5. **Simple Solutions** - Obvious code over clever abstractions
6. **One at a Time** - Complete MVP 1 before starting MVP 2

### 4.2 What NOT To Do ❌

1. **NO Repository/Service/Controller layers** - Direct handler → database
2. **NO Custom DI containers** - Use framework built-ins
3. **NO Mock data** - Real implementation or feature flag
4. **NO TODO comments** - Complete or remove
5. **NO Multiple MVPs** - One at a time, 100% complete
6. **NO Over-engineering** - Simple first, optimize later

---

## 5. **Technology Stack (Quick Reference)**

### Backend
```toml
# Rust 1.70+
rocket = "0.5"              # Web framework
sqlx = "0.7"                # Database (compile-time checked)
jsonwebtoken = "9.2"        # JWT auth
bcrypt = "0.15"             # Password hashing
```

### Frontend
```json
{
  "react": "^18.2.0",
  "@tanstack/react-router": "^1.0.0",
  "@tanstack/react-query": "^5.0.0",
  "shadcn/ui": "latest",
  "tailwindcss": "^3.3.0"
}
```

### Database
- PostgreSQL 15+
- Migrations via sqlx-cli

---

## 6. **Project Structure**

```
janus-2.0/
├── backend/                 # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── auth/           # Authentication
│   │   ├── personnel/      # Personnel CRUD
│   │   ├── organizations/        # Organization CRUD
│   │   ├── access/         # Access control
│   │   └── shared/         # Utilities
│   ├── migrations/         # SQL migrations
│   ├── tests/              # Integration tests
│   └── Cargo.toml
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── routes/         # Pages (file-based)
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # API client, utils
│   └── package.json
│
├── docs/                    # Documentation
│   └── janus-2.0-docs/     # This documentation
│
└── docker-compose.yml       # Deployment
```

---

## 7. **Implementation Steps (Quick)**

### Phase 0: Setup (1 day)
```bash
# Create project
cargo init backend
npm create vite@latest frontend -- --template react-ts

# Setup database
docker-compose up -d postgres
sqlx database create
```

### Phase 1: MVP 1 (2 weeks)
**Week 1**: Backend
- Auth (JWT, bcrypt)
- Personnel CRUD
- Organization CRUD
- Tests (100% coverage)

**Week 2**: Frontend
- Login page
- Personnel UI (list, create, edit)
- Organization UI
- E2E tests

### Phase 2: MVP 2 (2 weeks)
**Week 3**: Backend
- Three-tier access (Computer, Data, Physical)
- Audit logging
- Tests

**Week 4**: Frontend
- Access management UI
- Audit log viewer
- Reports

### Phase 3: Deploy (2 weeks)
- Performance optimization
- Security audit
- Documentation
- Production deployment

---

## 8. **Example Code (Simple!)**

### Backend Handler (Direct DB Access)
```rust
#[get("/personnel/<id>")]
async fn get_personnel(
    id: Uuid,
    _auth: AuthGuard,
    db: &State<PgPool>,
) -> Result<Json<Personnel>, ApiError> {
    // Direct query - no repository layer!
    let personnel = sqlx::query_as!(
        Personnel,
        "SELECT * FROM personnel WHERE id = $1",
        id
    )
    .fetch_optional(db.inner())
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(personnel))
}
```

### Frontend Component (Simple!)
```typescript
export default function PersonnelList() {
  const { data, isLoading } = usePersonnelList();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Personnel</h1>
      <Table>
        {data.items.map(person => (
          <TableRow key={person.id}>
            <TableCell>{person.firstName} {person.lastName}</TableCell>
            <TableCell>{person.clearanceLevel}</TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

**That's it!** No layers, no abstractions, just direct and simple.

---

## 9. **Performance Targets**

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| Backend Build | < 30 sec | Rust incremental compilation |
| Frontend Build | < 10 sec | Vite fast builds |
| API Response | < 50ms p95 | Direct SQL, proper indexes |
| Database Query | < 10ms | Indexed foreign keys |

---

## 10. **Testing Strategy**

### Backend (Rust)
```rust
#[test]
fn test_create_personnel() {
    // Arrange, Act, Assert
    // 100% coverage required
}
```

### Frontend (Vitest)
```typescript
test('should create personnel', () => {
  // Component testing
  // 70% coverage minimum
});
```

### E2E (Playwright)
```typescript
test('complete workflow', async ({ page }) => {
  // User journey testing
  // Critical paths only
});
```

---

## 11. **Deployment (Single Command!)**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
  backend:
    build: ./backend
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
```

```bash
# Deploy
docker-compose up -d

# Done!
```

---

## 12. **What Makes This Simple**

### Janus 1.0 → Janus 2.0

| Aspect | Janus 1.0 | Janus 2.0 | Improvement |
|--------|-----------|-----------|-------------|
| Layers | 4 | 1 | **75% simpler** |
| Build Time | 2-3 min | < 30 sec | **6x faster** |
| API Time | 200ms | < 50ms | **4x faster** |
| Dependencies | 80+ | ~40 | **50% fewer** |
| Code Lines | 27,000 | 13,500 | **50% less** |
| Agents | 10 | 5 | **50% simpler** |
| Tools | 4 (sync hell) | 1 (git) | **75% simpler** |

---

## 13. **Common Pitfalls (Avoid These!)**

Based on Janus 1.0 experience:

❌ **DON'T**:
- Add Repository/Service layers "for flexibility"
- Build custom DI containers
- Create 10+ specialized agents
- Sync multiple tools (Linear, Pieces, etc.)
- Use mock data in "complete" features
- Support multiple deployment modes
- Start multiple MVPs simultaneously

✅ **DO**:
- Query database directly
- Use framework built-ins
- Use 5 or fewer capable agents
- Use git as single source of truth
- Complete features or don't implement
- One deployment path (Docker)
- One MVP at a time, 100% complete

---

## 14. **Success Checklist**

MVP 1 is **complete** when:
- [ ] User can login (JWT auth)
- [ ] User can CRUD personnel
- [ ] User can CRUD organizations
- [ ] All API tests pass (100%)
- [ ] All E2E tests pass
- [ ] API responds < 50ms (p95)
- [ ] Builds < 30 seconds (backend)
- [ ] Docker deployment works
- [ ] Zero TODO comments
- [ ] Zero mock data
- [ ] Documentation complete

---

## 15. **Get Help**

### If Stuck
1. Read `09-LESSONS-LEARNED.md` - Most issues already solved
2. Read `02-ARCHITECTURE.md` - See the simple patterns
3. Check example code - Direct and simple
4. Ask: "What's the simplest solution?"

### If Tempted to Over-Engineer
**Stop** and ask:
- "Do I need this abstraction?" (Probably not)
- "Can I query the database directly?" (Probably yes)
- "Is this the simplest solution?" (If no, simplify)

---

## 16. **Next Steps**

### For AI Agents Implementing

**Step 1**: Read these docs in order (3 hours)
1. `09-LESSONS-LEARNED.md` ← **Start here!**
2. `00-OVERVIEW.md`
3. `02-ARCHITECTURE.md`
4. `11-IMPLEMENTATION-PLAN.md`

**Step 2**: Setup development environment (1 day)
- Follow Phase 0 in implementation plan
- Verify everything builds

**Step 3**: Implement MVP 1 (2 weeks)
- **Backend first** (per user preference)
- Follow implementation plan step-by-step
- Test as you go (TDD)

**Step 4**: Deploy MVP 1
- Docker compose deployment
- Verify all acceptance criteria met

**Step 5**: Implement MVP 2 (2 weeks)
- Repeat process for MVP 2
- Deploy when complete

### For Project Managers

**Timeline**: 6-8 weeks total
- Week 0: Setup
- Weeks 1-2: MVP 1 (Auth + Personnel + Organizations)
- Weeks 3-4: MVP 2 (Three-tier access + Audit)
- Weeks 5-6: Polish + Deploy

**Milestones**:
- Week 2: Testable MVP 1
- Week 4: Complete feature set (MVP 2)
- Week 6: Production deployment

---

## 17. **Summary**

**Janus 2.0 in One Sentence**:
> A **simple, fast, secure** personnel and access control system built with **Rust + React**, following the principle **"the simplest thing that could possibly work"**.

**Core Philosophy**:
- Simple over complex
- Complete over perfect
- Fast over flexible
- Clear over clever
- Focused over comprehensive

**Key Metrics**:
- < 30 sec builds
- < 50ms API responses
- ~13,500 lines of code
- ~40 dependencies
- 100% test coverage

---

## 18. **Final Advice**

### For Developers
**"When in doubt, simplify."**

- First solution: Direct database query
- If slow: Add index
- If still slow: Optimize query
- Only then: Consider abstraction

### For Architects  
**"YAGNI - You Aren't Gonna Need It"**

- Don't build for future requirements
- Don't add layers "for flexibility"
- Don't abstract until you need it twice
- Simple first, always

### For Everyone
**"Read the lessons learned first!"**

Every mistake from Janus 1.0 is documented. Learn from them!

---

**Ready to build Janus 2.0! 🚀**

*Start with `09-LESSONS-LEARNED.md` - It will save you weeks of work.*

