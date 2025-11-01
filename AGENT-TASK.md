# Discussions Backend Completion Task

**Worktree**: `../janus-2.0-worktrees/discussions-backend`  
**Branch**: `feature/discussions-backend-complete`  
**Agent**: Full-Stack Developer  
**Status**: 📋 Ready to Start

---

## 🎯 Objective

Complete the Discussions backend implementation by removing TODO comments and integrating proper auth context.

---

## 📋 Tasks

1. **Fix Auth Context in Handlers**
   - File: `backend/src/discussions/handlers.rs`
   - Current: `let created_by = 1; // TODO: Get from auth context`
   - Action: Replace with proper auth guard extraction
   - Reference: See `backend/src/personnel/handlers.rs` for pattern

2. **Review All Handlers**
   - Check all endpoints for TODO comments
   - Ensure all handlers use proper auth middleware
   - Verify permission checks where needed

3. **Test All Endpoints**
   - Verify all CRUD operations work
   - Test with different user roles
   - Ensure proper error handling

4. **Run Backend Tests**
   ```bash
   cd backend
   cargo test discussions::tests --lib
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(discussions): complete backend implementation with auth context"
   ```

---

## ✅ Acceptance Criteria

- [ ] No TODO comments in `backend/src/discussions/handlers.rs`
- [ ] All handlers use proper auth context (not hardcoded `1`)
- [ ] All tests pass
- [ ] Code compiles without warnings
- [ ] Follows patterns from other modules (personnel, vendors)

---

## 📝 Notes

- Reference implementation: `backend/src/personnel/handlers.rs`
- Auth pattern: Use Rocket's `State` with auth guard
- Permission checks: Use `role_has_permission()` from `shared/rbac.rs`

---

**Ready to start!** Begin with Task 1: Fix Auth Context

