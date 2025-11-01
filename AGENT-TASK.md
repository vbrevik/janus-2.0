# Roles & Permissions Frontend Task

**Worktree**: `../janus-2.0-worktrees/roles-frontend`  
**Branch**: `feature/roles-frontend`  
**Agent**: Full-Stack Developer  
**Status**: 🚧 In Progress  
**Depends on**: Backend is complete ✅  
**Current Task**: Creating API hooks and routes

---

## 🎯 Objective

Build the Roles & Permissions management UI for the frontend.

---

## 📋 Tasks

1. **Review Backend API**
   - Check `backend/src/roles/handlers.rs`
   - Understand available endpoints
   - Reference: `docs/ROLES-PERMISSIONS-USER-STORIES.md`

2. **Create API Hooks**
   - File: `frontend/src/hooks/use-roles.ts`
   - Functions: `listRoles()`, `createRole()`, `updateRole()`, `deleteRole()`
   - Functions: `listPermissions()`, `getRolePermissions()`, `setRolePermissions()`
   - Use TanStack Query

3. **Create Roles List Page**
   - File: `frontend/src/routes/roles/index.tsx`
   - Display list of roles with name, description
   - Add "Create Role" button
   - Actions: Edit, Delete

4. **Create Role Form**
   - File: `frontend/src/components/role-form.tsx` (or inline)
   - Fields: Name, Description
   - Validation: Name required, unique
   - Used for: Create and Edit

5. **Create Permissions Management**
   - File: `frontend/src/routes/roles/$roleId/permissions.tsx`
   - Display all permissions (checkboxes)
   - Show currently assigned permissions
   - Save button to update permissions

6. **Add Navigation**
   - Update `frontend/src/components/layout.tsx`
   - Add "Roles & Permissions" menu item (admin only)

7. **Write E2E Tests**
   - File: `frontend/e2e/roles.spec.ts`
   - Test: Create role, assign permissions, delete role

8. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(frontend): add roles and permissions management UI"
   ```

---

## ✅ Acceptance Criteria

- [ ] All CRUD operations work (Create, Read, Update, Delete roles)
- [ ] Permission assignment UI works
- [ ] Proper permission checks (admin only)
- [ ] E2E tests pass
- [ ] Follows patterns from personnel/vendor UI

---

## 📝 Notes

- Reference: `frontend/src/routes/personnel/` for UI patterns
- API endpoints: `/api/roles`, `/api/roles/{id}`, `/api/roles/permissions`, etc.
- User stories: See `docs/ROLES-PERMISSIONS-USER-STORIES.md`

---

**Ready to start!** Begin with Task 1: Review Backend API

