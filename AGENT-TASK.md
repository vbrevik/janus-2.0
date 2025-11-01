# Document References Backend Completion Task

**Worktree**: `../janus-2.0-worktrees/doc-ref-backend`  
**Branch**: `feature/doc-ref-backend-complete`  
**Agent**: Full-Stack Developer  
**Status**: 📋 Ready to Start

---

## 🎯 Objective

Complete the Document References backend implementation - verify all handlers are complete and working.

---

## 📋 Tasks

1. **Review Handlers**
   - File: `backend/src/document_references/handlers.rs`
   - Check all CRUD endpoints are implemented
   - Verify auth middleware is applied
   - Ensure proper error handling

2. **Check Models**
   - File: `backend/src/document_references/models.rs`
   - Verify all required fields are present
   - Check database schema matches models

3. **Test All Endpoints**
   - Verify all CRUD operations work
   - Test with different user roles
   - Ensure proper error handling

4. **Run Backend Tests**
   ```bash
   cd backend
   cargo test document_references::tests --lib
   ```

5. **Verify Database Schema**
   - Check migration: `backend/migrations/*_document_references*.sql`
   - Ensure all tables/columns exist

6. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(document-references): complete backend implementation"
   ```

---

## ✅ Acceptance Criteria

- [ ] All handlers implemented and working
- [ ] All handlers use proper auth middleware
- [ ] All tests pass
- [ ] Code compiles without warnings
- [ ] Follows patterns from other modules (personnel, vendors)

---

## 📝 Notes

- Reference implementation: `backend/src/personnel/handlers.rs`
- Auth pattern: Use Rocket's `State` with auth guard
- Permission checks: Use `role_has_permission()` from `shared/rbac.rs`

---

**Ready to start!** Begin with Task 1: Review Handlers

