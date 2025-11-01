# Git Worktrees Parallel Work Proposal for Janus 2.0

**Based on**: Current project state, implementation plan, and in-progress features  
**Purpose**: Enable multiple agents to work simultaneously on different features  
**Last Updated**: 2025-01-30

---

## 📊 Current State Analysis

### Active Branch
- `feature/info-systems-crud` - In progress

### Incomplete Features (Untracked/Partial)
Based on git status and codebase analysis:

1. **NDA Management** (`backend/src/nda/`) - Backend started, needs:
   - Frontend UI
   - E2E tests
   - TODO: Auth context integration

2. **Discussions** (`backend/src/discussions/`) - Backend started, needs:
   - Frontend UI
   - E2E tests
   - TODO: Auth context integration

3. **Document References** (`backend/src/document_references/`) - Backend started, needs:
   - Frontend UI
   - E2E tests

4. **Roles & Permissions** (`backend/src/roles/`) - Backend implemented, needs:
   - Frontend UI
   - E2E tests

5. **Info Systems** (`backend/src/info_systems/`) - Backend in progress (current branch)

6. **Access Control** (`backend/src/access/`) - Backend exists, needs:
   - Auth guards (TODO comments present)
   - Frontend UI improvements
   - E2E tests

### Planned Work (From Implementation Plan)

**MVP 1 Week 2 - Frontend (In Progress)**:
- ✅ Audit log viewer (completed)
- ⏳ Personnel UI enhancements
- ⏳ Vendor UI enhancements
- ⏳ Date range filters for audit

**Future MVP 2**:
- Three-tier access control frontend
- Access card management UI
- Compliance reports

---

## 🚀 Proposed Worktree Configuration

### Scenario 1: Parallel Frontend Development

**Situation**: Multiple frontend features can be developed simultaneously

```bash
# Main directory - Info Systems (current work)
cd /Users/vidarbrevik/projects/janus-2.0
git checkout feature/info-systems-crud
# Full-Stack Developer: Completing Info Systems CRUD

# Worktree 1 - NDA Frontend
git worktree add -b feature/nda-frontend ../janus-2.0-worktrees/nda-frontend
cd ../janus-2.0-worktrees/nda-frontend
# Full-Stack Developer or Tester: Builds NDA frontend UI
# Depends on: backend/src/nda/ (already exists)

# Worktree 2 - Roles & Permissions Frontend
git worktree add -b feature/roles-frontend ../janus-2.0-worktrees/roles-frontend
cd ../janus-2.0-worktrees/roles-frontend
# Full-Stack Developer: Builds roles/permissions management UI
# Depends on: backend/src/roles/ (already implemented)

# Worktree 3 - Discussions Frontend
git worktree add -b feature/discussions-frontend ../janus-2.0-worktrees/discussions-frontend
cd ../janus-2.0-worktrees/discussions-frontend
# Full-Stack Developer: Builds discussions UI
# Depends on: backend/src/discussions/ (already exists)
```

**Agents Working**:
- **Agent 1** (Main): Info Systems CRUD completion
- **Agent 2** (Worktree 1): NDA Frontend
- **Agent 3** (Worktree 2): Roles Frontend
- **Agent 4** (Worktree 3): Discussions Frontend

**Benefit**: 4 frontend features in parallel = **4x faster** than sequential

---

### Scenario 2: Backend + Frontend + Testing (Classic Parallelism)

**Situation**: While one agent implements backend, others can work on completed features

```bash
# Main directory - New Backend Feature
cd /Users/vidarbrevik/projects/janus-2.0
git checkout -b feature/document-references-backend
# Full-Stack Developer: Completes document_references backend

# Worktree 1 - NDA Frontend (backend already done)
git worktree add ../janus-2.0-worktrees/nda-frontend main
cd ../janus-2.0-worktrees/nda-frontend
git checkout -b feature/nda-frontend
# Full-Stack Developer: Implements NDA frontend

# Worktree 2 - Roles E2E Tests (backend + frontend done)
git worktree add ../janus-2.0-worktrees/roles-tests main
cd ../janus-2.0-worktrees/roles-tests
git checkout -b feature/roles-e2e-tests
# Tester: Writes E2E tests for roles feature
```

**Agents Working**:
- **Agent 1** (Main): Document References Backend
- **Agent 2** (Worktree 1): NDA Frontend
- **Agent 3** (Worktree 2): Roles E2E Tests

**Benefit**: Three agents, three different phases = **efficient pipeline**

---

### Scenario 3: Frontend Enhancements + Bug Fixes + Documentation

**Situation**: Multiple non-conflicting improvements

```bash
# Main directory - Current Feature
cd /Users/vidarbrevik/projects/janus-2.0
git checkout feature/info-systems-crud
# Full-Stack Developer: Completes Info Systems

# Worktree 1 - Audit Log Enhancements
git worktree add -b feature/audit-enhancements ../janus-2.0-worktrees/audit-enhance
cd ../janus-2.0-worktrees/audit-enhance
# Full-Stack Developer: Adds date range filters, export functionality

# Worktree 2 - Access Control Auth Fixes
git worktree add -b feature/access-auth-fixes ../janus-2.0-worktrees/access-fixes
cd ../janus-2.0-worktrees/access-fixes
# Full-Stack Developer: Removes TODO comments, adds auth guards

# Worktree 3 - Documentation Updates
git worktree add -b feature/docs-update ../janus-2.0-worktrees/docs
cd ../janus-2.0-worktrees/docs
# Coordinator: Updates user stories, implementation docs
```

**Agents Working**:
- **Agent 1** (Main): Info Systems
- **Agent 2** (Worktree 1): Audit Enhancements
- **Agent 3** (Worktree 2): Access Auth Fixes
- **Agent 4** (Worktree 3): Documentation

**Benefit**: Multiple improvements in parallel = **faster iteration**

---

## 📋 Specific Parallel Work Opportunities

### Opportunity 1: Complete Incomplete Backend Features (Parallel)

**Current State**: Multiple backend modules started but incomplete

```bash
# Worktree 1 - NDA Backend Completion
git worktree add -b feature/nda-backend-complete ../janus-2.0-worktrees/nda-backend
cd ../janus-2.0-worktrees/nda-backend
# Task: Remove TODO comments, add auth context, complete handlers

# Worktree 2 - Discussions Backend Completion  
git worktree add -b feature/discussions-backend-complete ../janus-2.0-worktrees/discussions-backend
cd ../janus-2.0-worktrees/discussions-backend
# Task: Remove TODO comments, add auth context, complete handlers

# Worktree 3 - Document References Backend Completion
git worktree add -b feature/doc-ref-backend-complete ../janus-2.0-worktrees/doc-ref-backend
cd ../janus-2.0-worktrees/doc-ref-backend
# Task: Complete document_references handlers, add tests
```

**Estimated Time Savings**: 3 features × 2 hours = 6 hours → **2 hours parallel** = **4 hours saved**

---

### Opportunity 2: Frontend for Completed Backends (Parallel)

**Current State**: Roles backend complete, needs frontend

```bash
# Worktree 1 - Roles Frontend
git worktree add -b feature/roles-frontend ../janus-2.0-worktrees/roles-frontend
cd ../janus-2.0-worktrees/roles-frontend
# Task: Build roles/permissions management UI
# Depends on: backend/src/roles/ ✅ (complete)

# Worktree 2 - Info Systems Frontend
git worktree add -b feature/info-systems-frontend ../janus-2.0-worktrees/info-systems-frontend
cd ../janus-2.0-worktrees/info-systems-frontend
# Task: Build info systems CRUD UI
# Depends on: backend/src/info_systems/ (when main branch completes)
```

**Estimated Time Savings**: 2 features × 3 hours = 6 hours → **3 hours parallel** = **3 hours saved**

---

### Opportunity 3: Testing While Development Continues (Classic Pipeline)

**Current State**: Some features have backend + frontend, need tests

```bash
# Main directory - New Feature Development
cd /Users/vidarbrevik/projects/janus-2.0
git checkout -b feature/new-feature
# Full-Stack Developer: Implements new feature

# Worktree 1 - Roles E2E Tests
git worktree add ../janus-2.0-worktrees/roles-tests main
cd ../janus-2.0-worktrees/roles-tests
git checkout -b feature/roles-e2e-tests
# Tester: Writes E2E tests for roles (backend + frontend done)

# Worktree 2 - Info Systems E2E Tests
git worktree add ../janus-2.0-worktrees/info-systems-tests main
cd ../janus-2.0-worktrees/info-systems-tests
git checkout -b feature/info-systems-e2e-tests
# Tester: Writes E2E tests for info systems (when ready)
```

**Benefit**: Tester doesn't wait for new features - works on completed ones

---

### Opportunity 4: Infrastructure + Feature Development (Separate Concerns)

**Current State**: Docker, performance, and feature work can be parallel

```bash
# Main directory - Feature Work
cd /Users/vidarbrevik/projects/janus-2.0
git checkout feature/info-systems-crud
# Full-Stack Developer: Feature implementation

# Worktree 1 - Docker Optimization
git worktree add -b feature/docker-m2-optimization ../janus-2.0-worktrees/docker
cd ../janus-2.0-worktrees/docker
# DevOps: Optimizes Docker for Mac M2, performance tuning

# Worktree 2 - Database Indexing
git worktree add -b feature/db-optimization ../janus-2.0-worktrees/db
cd ../janus-2.0-worktrees/db
# DevOps: Adds database indexes, optimizes queries
```

**Benefit**: Infrastructure improvements don't block feature work

---

## 🎯 Recommended Worktree Strategy

### Phase 1: Complete Incomplete Backend Features (Now)

**Setup**:
```bash
# Create worktree directory
mkdir -p ../janus-2.0-worktrees

# Main: Info Systems (current work)
cd /Users/vidarbrevik/projects/janus-2.0
git checkout feature/info-systems-crud

# Worktree 1: NDA Backend Completion
git worktree add -b feature/nda-backend-complete ../janus-2.0-worktrees/nda-backend

# Worktree 2: Discussions Backend Completion
git worktree add -b feature/discussions-backend-complete ../janus-2.0-worktrees/discussions-backend

# Worktree 3: Document References Backend Completion
git worktree add -b feature/doc-ref-backend-complete ../janus-2.0-worktrees/doc-ref-backend
```

**Tasks**:
- **Main**: Complete Info Systems CRUD
- **Worktree 1**: Remove NDA TODOs, add auth context
- **Worktree 2**: Remove Discussions TODOs, add auth context
- **Worktree 3**: Complete Document References handlers

**Time**: 6-8 hours sequential → **2-3 hours parallel** = **4-5 hours saved**

---

### Phase 2: Frontend Development (After Backend Complete)

**Setup**:
```bash
# Worktree 1: Roles Frontend (backend done)
git worktree add -b feature/roles-frontend ../janus-2.0-worktrees/roles-frontend

# Worktree 2: NDA Frontend (backend done after Phase 1)
git worktree add -b feature/nda-frontend ../janus-2.0-worktrees/nda-frontend

# Worktree 3: Info Systems Frontend (backend done after main branch)
git worktree add -b feature/info-systems-frontend ../janus-2.0-worktrees/info-systems-frontend
```

**Tasks**:
- **Worktree 1**: Build roles/permissions management UI
- **Worktree 2**: Build NDA management UI
- **Worktree 3**: Build Info Systems CRUD UI

**Time**: 9 hours sequential → **3 hours parallel** = **6 hours saved**

---

### Phase 3: Testing + New Features (Continuous)

**Setup**:
```bash
# Main: New feature development
cd /Users/vidarbrevik/projects/janus-2.0
git checkout -b feature/new-feature

# Worktree 1: E2E Tests for completed features
git worktree add ../janus-2.0-worktrees/e2e-tests main
cd ../janus-2.0-worktrees/e2e-tests
git checkout -b feature/roles-nda-e2e-tests
# Tester: Writes E2E tests

# Worktree 2: Bug fixes/improvements
git worktree add -b feature/access-auth-fixes ../janus-2.0-worktrees/bug-fixes
cd ../janus-2.0-worktrees/bug-fixes
# Full-Stack Developer: Fixes access control auth guards
```

**Benefit**: Continuous pipeline - development + testing in parallel

---

## 📊 Expected Time Savings

### Without Worktrees (Sequential)

```
Task                           | Time | Cumulative
-------------------------------|------|------------
Info Systems CRUD             | 2h   | 2h
NDA Backend Complete           | 2h   | 4h
Discussions Backend Complete   | 2h   | 6h
Doc Refs Backend Complete     | 2h   | 8h
Roles Frontend                 | 3h   | 11h
NDA Frontend                   | 3h   | 14h
Info Systems Frontend          | 3h   | 17h
Roles E2E Tests               | 2h   | 19h
NDA E2E Tests                 | 2h   | 21h
--------------------------------|------|------------
Total                         | 21h  | 21h
```

### With Worktrees (Parallel)

```
Phase 1: Backend (Parallel)
Task                           | Time | Parallel Time
-------------------------------|------|--------------
Info Systems CRUD             | 2h   |
NDA Backend Complete           | 2h   | } 2h max
Discussions Backend Complete   | 2h   | }
Doc Refs Backend Complete     | 2h   | }

Phase 2: Frontend (Parallel)
Roles Frontend                 | 3h   |
NDA Frontend                   | 3h   | } 3h max
Info Systems Frontend          | 3h   | }

Phase 3: Testing (Parallel)
Roles E2E Tests               | 2h   |
NDA E2E Tests                 | 2h   | } 2h max
--------------------------------|------|--------------
Total Sequential               | 21h  |
Total Parallel                | 7h   | **14h saved**
```

**Savings**: **66% time reduction** (14 hours saved)

---

## 🔧 Practical Setup Script

### Create Worktrees for Current Opportunities

```bash
#!/bin/bash
# scripts/setup-parallel-worktrees.sh

BASE_DIR="/Users/vidarbrevik/projects/janus-2.0"
WT_DIR="../janus-2.0-worktrees"

cd "$BASE_DIR"

# Create worktree directory
mkdir -p "$WT_DIR"

# Phase 1: Backend Completion Worktrees
echo "Creating backend completion worktrees..."

# NDA Backend
git worktree add -b feature/nda-backend-complete "$WT_DIR/nda-backend" 2>/dev/null || \
  echo "NDA backend worktree already exists"

# Discussions Backend
git worktree add -b feature/discussions-backend-complete "$WT_DIR/discussions-backend" 2>/dev/null || \
  echo "Discussions backend worktree already exists"

# Document References Backend
git worktree add -b feature/doc-ref-backend-complete "$WT_DIR/doc-ref-backend" 2>/dev/null || \
  echo "Doc ref backend worktree already exists"

# Phase 2: Frontend Worktrees (ready when backend done)
echo "Creating frontend worktrees..."

# Roles Frontend
git worktree add -b feature/roles-frontend "$WT_DIR/roles-frontend" 2>/dev/null || \
  echo "Roles frontend worktree already exists"

# NDA Frontend
git worktree add -b feature/nda-frontend "$WT_DIR/nda-frontend" 2>/dev/null || \
  echo "NDA frontend worktree already exists"

echo "Worktrees created. Use 'git worktree list' to see all worktrees."
```

---

## ⚠️ Important Considerations

### 1. Dependency Management

**Rule**: Only parallelize independent work

**✅ Can be parallel**:
- Different features (NDA vs Roles vs Info Systems)
- Different phases (Backend vs Frontend vs Tests)
- Different concerns (Features vs Infrastructure)

**❌ Cannot be parallel**:
- Same feature, same phase (both agents on Info Systems backend)
- Dependent features (Feature B needs Feature A first)

### 2. Merge Strategy

**When to merge**:
```bash
# After worktree work completes
cd /Users/vidarbrevik/projects/janus-2.0
git checkout main
git merge feature/nda-backend-complete
git merge feature/roles-frontend
# ... etc

# Clean up worktrees
git worktree remove ../janus-2.0-worktrees/nda-backend
git branch -d feature/nda-backend-complete
```

### 3. Conflicts

Even with worktrees, merge conflicts possible when merging branches:
- **Normal**: Resolve conflicts during merge (expected Git behavior)
- **Minimize**: Use separate features/branches (worktrees handle this)

---

## 📈 Success Metrics

### Track These Metrics:

1. **Parallel Work Efficiency**
   - Hours saved vs sequential
   - Number of agents working simultaneously

2. **Feature Completion Rate**
   - Features completed per week
   - Backlog reduction rate

3. **Merge Conflicts**
   - Conflicts per merge (should be minimal with separate features)
   - Time to resolve conflicts

### Example Tracking:

```
Week 1: Used worktrees for 3 features
- Sequential time: 9 hours
- Parallel time: 3 hours
- Savings: 6 hours (66%)
- Conflicts: 0 (separate features)
```

---

## ✅ Next Steps

1. **Immediate**: Set up Phase 1 worktrees (backend completion)
   ```bash
   ./scripts/setup-parallel-worktrees.sh
   ```

2. **This Week**: Run parallel backend completion
   - Main: Info Systems
   - Worktree 1: NDA Backend
   - Worktree 2: Discussions Backend
   - Worktree 3: Doc Refs Backend

3. **Next Week**: Run parallel frontend development
   - Worktree 1: Roles Frontend
   - Worktree 2: NDA Frontend
   - Worktree 3: Info Systems Frontend

4. **Ongoing**: Maintain parallel testing pipeline
   - Tester writes E2E tests for completed features
   - Developer continues new feature work

---

## 🎓 Summary

**Best Use Cases for Worktrees in Janus 2.0**:

1. ✅ **Complete incomplete backend features** (3-4 in parallel)
2. ✅ **Build frontends for completed backends** (2-3 in parallel)
3. ✅ **Test completed features while developing new ones** (pipeline)
4. ✅ **Separate infrastructure work from feature work** (parallel concerns)

**Expected Savings**: **50-66% time reduction** on multi-feature work

**Risk**: Low - separate features minimize conflicts

**Recommendation**: **Start with Phase 1** - complete incomplete backends in parallel

---

**Document Version**: 1.0  
**Created**: 2025-01-30  
**Based on**: Current project state, git status, implementation plan

