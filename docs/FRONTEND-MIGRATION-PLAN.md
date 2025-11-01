# Frontend Consolidation Migration Plan

## 🎯 **Goal**

Consolidate three separate frontends (`frontend/`, `enduser-frontend/`, `official-frontend/`) into a single frontend with **role-based routing and views**.

---

## 📊 **Pre-Migration Analysis**

### Current State

| Frontend | Port | Routes | Files | Purpose |
|----------|------|--------|-------|---------|
| `frontend/` | 15510 | `/dashboard`, `/personnel/*`, `/vendors/*`, `/info-systems`, `/access/*`, `/ndas/*`, `/audit/*`, `/roles/*` | 56 TS files | Admin - Full CRUD |
| `enduser-frontend/` | 15511 | `/tasks`, `/profile` | 30 TS files | End User - Tasks (NDAs, docs) |
| `official-frontend/` | 15513 | `/dashboard`, `/personnel`, `/vendors` | 27 TS files | Official - Read-only lookup |

### User Roles (from backend)

- `admin` - Full access to all features
- `enduser` - Limited to task completion (NDAs, documents)
- `official` - Read-only access (personnel/vendor lookup)

### Code Duplication Identified

- ✅ `lib/api.ts` - **100% identical** (85 lines × 3)
- ✅ `contexts/auth-context.tsx` - **100% identical** (93 lines × 3)
- ✅ UI components (Button, Card, Table, etc.) - **~80% identical**
- ✅ Types (`types/api.ts`, `types/personnel.ts`, etc.) - **~70% identical**
- ✅ Hooks (`hooks/use-personnel.ts`, `hooks/use-nda.ts`) - **~60% identical**

**Estimated Reduction**: ~70% code elimination after consolidation

---

## 🏗️ **Target Architecture**

### Route Structure

```
Single Frontend (port 15510)
├── /login                          # Unified login (role detection)
├── /                               # Redirect based on role
│
├── /admin/*                        # Admin routes (protected)
│   ├── /admin/dashboard            # Admin dashboard
│   ├── /admin/personnel/*          # Personnel CRUD
│   ├── /admin/vendors/*            # Vendor CRUD
│   ├── /admin/info-systems         # Info Systems CRUD
│   ├── /admin/access/*             # Access Control
│   ├── /admin/ndas/*               # NDA Management
│   ├── /admin/audit/*              # Audit Logs
│   └── /admin/roles/*              # Role Management
│
├── /enduser/*                      # End User routes (protected)
│   ├── /enduser/tasks              # Task management (NDAs, docs)
│   └── /enduser/profile            # Profile settings
│
└── /official/*                      # Official routes (protected)
    ├── /official/dashboard          # Official dashboard
    ├── /official/personnel          # Personnel lookup (read-only)
    └── /official/vendors             # Vendor lookup (read-only)
```

### Navigation Flow

```
Login → Role Detection → Redirect:
  - admin → /admin/dashboard
  - enduser → /enduser/tasks
  - official → /official/dashboard
```

---

## 📋 **Migration Phases**

### **Phase 0: Preparation & Setup** (Day 1)

#### 0.1 Create Migration Branch
```bash
git checkout -b feature/frontend-consolidation
```

#### 0.2 Document Current Routes
- [ ] List all routes from each frontend
- [ ] Document route dependencies
- [ ] Identify route conflicts (if any)

#### 0.3 Backup Current State
- [ ] Create backup branch: `backup/pre-consolidation-$(date +%Y%m%d)`
- [ ] Document all three frontend URLs and test them
- [ ] Screenshot current UIs for reference

**Deliverable**: Branch created, routes documented, backups made

---

### **Phase 1: Shared Code Consolidation** (Days 2-3)

#### 1.1 Create Unified API Client
- [ ] Move `lib/api.ts` to shared location
- [ ] Ensure all imports work
- [ ] Test API calls work correctly

**File**: `frontend/src/lib/api.ts` (keep as is, it's already correct)

#### 1.2 Create Unified Auth Context
- [ ] Enhance `contexts/auth-context.tsx` to support role-based redirects
- [ ] Add `getDefaultRoute(role)` helper function
- [ ] Add `hasRole(role)` and `hasAnyRole(roles)` helpers
- [ ] Test with all three roles

**New Helper Function**:
```typescript
// contexts/auth-context.tsx
export function getDefaultRoute(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'enduser':
      return '/enduser/tasks'
    case 'official':
      return '/official/dashboard'
    default:
      return '/login'
  }
}

export function hasRole(userRole: string, requiredRole: string): boolean {
  return userRole === requiredRole
}

export function hasAnyRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}
```

#### 1.3 Consolidate Shared Types
- [ ] Compare types from all three frontends
- [ ] Merge into single `types/` directory
- [ ] Resolve type conflicts (use most complete version)
- [ ] Update all imports

**Files to consolidate**:
- `types/api.ts` - API response types
- `types/personnel.ts` - Personnel types
- `types/vendor.ts` - Vendor types
- `types/nda.ts` - NDA types
- `types/user.ts` - User/auth types

#### 1.4 Consolidate Shared Hooks
- [ ] Compare hooks from all three frontends
- [ ] Merge into single `hooks/` directory
- [ ] Resolve conflicts (use most complete version)
- [ ] Update all imports

**Hooks to consolidate**:
- `hooks/use-personnel.ts`
- `hooks/use-vendors.ts`
- `hooks/use-nda.ts`
- `hooks/use-document-references.ts`
- `hooks/use-discussions.ts`

#### 1.5 Verify UI Components
- [ ] Compare UI components (Button, Card, Table, etc.)
- [ ] Ensure shadcn/ui components are identical
- [ ] Remove duplicates (if any)

**Deliverable**: All shared code consolidated, no duplication

---

### **Phase 2: Role-Based Route Guards** (Days 4-5)

#### 2.1 Create Route Protection Component
```typescript
// components/ProtectedRoute.tsx
import { Navigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import { getDefaultRoute } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to default route for user's role
    const defaultRoute = redirectTo || getDefaultRoute(user.role)
    return <Navigate to={defaultRoute} />
  }

  return <>{children}</>
}
```

#### 2.2 Create Role-Based Route Wrapper
```typescript
// lib/route-helpers.ts
import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export function createProtectedRoute(
  path: string,
  allowedRoles: string[],
  component: React.ComponentType
) {
  return createFileRoute(path)({
    component: () => (
      <ProtectedRoute allowedRoles={allowedRoles}>
        {component()}
      </ProtectedRoute>
    ),
  })
}
```

#### 2.3 Update Root Route
- [ ] Update `routes/index.tsx` to redirect based on role
```typescript
// routes/index.tsx
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import { getDefaultRoute } from '@/contexts/auth-context'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />
  }

  const defaultRoute = getDefaultRoute(user.role)
  return <Navigate to={defaultRoute} />
}
```

**Deliverable**: Route guards implemented and tested

---

### **Phase 3: Route Migration** (Days 6-8)

#### 3.1 Migrate Admin Routes
- [ ] Move admin routes to `/admin/*` prefix
- [ ] Apply route guards (`allowedRoles: ['admin']`)
- [ ] Update navigation links in Layout
- [ ] Test all admin routes

**Route Structure**:
```
routes/
├── admin/
│   ├── dashboard.tsx
│   ├── personnel/
│   │   ├── index.tsx
│   │   └── $personnelId.tsx
│   ├── vendors/
│   │   ├── index.tsx
│   │   └── $vendorId.tsx
│   ├── info-systems.tsx
│   ├── access/
│   │   └── index.tsx
│   ├── ndas/
│   │   └── index.tsx
│   ├── audit/
│   │   └── index.tsx
│   └── roles/
│       └── index.tsx
```

**Migration Steps**:
1. Create `routes/admin/` directory
2. Move existing routes to `admin/` subdirectory
3. Update route paths (e.g., `createFileRoute('/admin/dashboard')`)
4. Wrap with `ProtectedRoute` with `allowedRoles: ['admin']`
5. Update all navigation links

#### 3.2 Migrate End User Routes
- [ ] Copy routes from `enduser-frontend/src/routes/` to `frontend/src/routes/enduser/`
- [ ] Apply route guards (`allowedRoles: ['enduser']`)
- [ ] Update navigation links
- [ ] Test all end user routes

**Files to copy**:
- `enduser-frontend/src/routes/tasks.tsx` → `frontend/src/routes/enduser/tasks.tsx`
- `enduser-frontend/src/routes/profile.tsx` → `frontend/src/routes/enduser/profile.tsx`

**Route Guards**:
```typescript
// routes/enduser/tasks.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import TasksPage from './TasksPage'

export const Route = createFileRoute('/enduser/tasks')({
  component: () => (
    <ProtectedRoute allowedRoles={['enduser']}>
      <TasksPage />
    </ProtectedRoute>
  ),
})
```

#### 3.3 Migrate Official Routes
- [ ] Copy routes from `official-frontend/src/routes/` to `frontend/src/routes/official/`
- [ ] Apply route guards (`allowedRoles: ['official']`)
- [ ] Ensure all views are read-only (remove edit buttons)
- [ ] Update navigation links
- [ ] Test all official routes

**Files to copy**:
- `official-frontend/src/routes/dashboard.tsx` → `frontend/src/routes/official/dashboard.tsx`
- `official-frontend/src/routes/personnel.tsx` → `frontend/src/routes/official/personnel.tsx`
- `official-frontend/src/routes/vendors.tsx` → `frontend/src/routes/official/vendors.tsx`

#### 3.4 Update Unified Login
- [ ] Update `routes/login.tsx` to redirect based on role after login
```typescript
// routes/login.tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ... login code ...
  try {
    await login(username, password)
    const user = await getCurrentUser() // Get user from context
    const defaultRoute = getDefaultRoute(user.role)
    navigate({ to: defaultRoute })
  } catch (err) {
    // ... error handling ...
  }
}
```

**Deliverable**: All routes migrated, route guards working

---

### **Phase 4: Layout & Navigation Updates** (Days 9-10)

#### 4.1 Create Role-Based Layout Component
- [ ] Update `components/layout.tsx` to show navigation based on role
- [ ] Hide admin nav items for non-admin users
- [ ] Show appropriate nav for each role

**Layout Navigation Logic**:
```typescript
// components/layout.tsx
function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const adminNavItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/personnel', label: 'Personnel', icon: Users },
    { to: '/admin/vendors', label: 'Vendors', icon: Building2 },
    { to: '/admin/info-systems', label: 'Info Systems', icon: Server },
    { to: '/admin/access', label: 'Access Control', icon: Key },
    { to: '/admin/ndas', label: 'NDAs', icon: FileText },
    { to: '/admin/audit', label: 'Audit Logs', icon: Search },
    { to: '/admin/roles', label: 'Roles', icon: Lock },
  ]

  const enduserNavItems = [
    { to: '/enduser/tasks', label: 'My Tasks', icon: FileText },
    { to: '/enduser/profile', label: 'Profile', icon: User },
  ]

  const officialNavItems = [
    { to: '/official/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/official/personnel', label: 'Personnel Lookup', icon: Users },
    { to: '/official/vendors', label: 'Vendor Lookup', icon: Building2 },
  ]

  const getNavItems = () => {
    if (user?.role === 'admin') return adminNavItems
    if (user?.role === 'enduser') return enduserNavItems
    if (user?.role === 'official') return officialNavItems
    return []
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-background">
      <header>
        {/* Header content */}
        <nav>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}>
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

#### 4.2 Update Profile Route
- [ ] Create unified profile route that works for all roles
- [ ] Show role-appropriate fields
- [ ] Apply route guard for authenticated users only

#### 4.3 Update 404/Not Found
- [ ] Create role-aware 404 page
- [ ] Suggest appropriate routes based on user role

**Deliverable**: Layout shows correct navigation per role

---

### **Phase 5: Testing & Validation** (Days 11-12)

#### 5.1 Unit Tests
- [ ] Test route guards work correctly
- [ ] Test role-based navigation
- [ ] Test login redirects

#### 5.2 Integration Tests
- [ ] Test admin user can access admin routes
- [ ] Test admin user cannot access enduser/official routes
- [ ] Test enduser user can access enduser routes
- [ ] Test enduser user cannot access admin routes
- [ ] Test official user can access official routes
- [ ] Test official user cannot access admin/enduser routes

#### 5.3 E2E Tests
- [ ] Create E2E tests for role-based routing
- [ ] Test login flow for each role
- [ ] Test navigation for each role
- [ ] Test route protection (unauthorized access attempts)

**New E2E Test File**:
```typescript
// frontend/e2e/role-based-routing.spec.ts
import { test, expect } from '@playwright/test'

test('admin user redirects to admin dashboard', async ({ page }) => {
  // Login as admin
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Should redirect to admin dashboard
  await expect(page).toHaveURL('/admin/dashboard')
})

test('enduser cannot access admin routes', async ({ page }) => {
  // Login as enduser
  // ... login code ...
  
  // Try to access admin route
  await page.goto('/admin/personnel')
  
  // Should redirect to enduser default route
  await expect(page).toHaveURL('/enduser/tasks')
})
```

#### 5.4 Manual Testing Checklist
- [ ] Login as admin → redirects to `/admin/dashboard`
- [ ] Login as enduser → redirects to `/enduser/tasks`
- [ ] Login as official → redirects to `/official/dashboard`
- [ ] Admin can access all admin routes
- [ ] Admin cannot access `/enduser/*` or `/official/*` routes
- [ ] Enduser can access `/enduser/*` routes
- [ ] Enduser cannot access `/admin/*` or `/official/*` routes
- [ ] Official can access `/official/*` routes
- [ ] Official cannot access `/admin/*` or `/enduser/*` routes
- [ ] All CRUD operations work for admin
- [ ] All tasks work for enduser
- [ ] All lookups work for official (read-only)

**Deliverable**: All tests passing, manual testing complete

---

### **Phase 6: Cleanup & Documentation** (Days 13-14)

#### 6.1 Remove Old Frontends
- [ ] Delete `enduser-frontend/` directory
- [ ] Delete `official-frontend/` directory
- [ ] Update `.gitignore` if needed

#### 6.2 Update Documentation
- [ ] Update `README.md` with new route structure
- [ ] Update `docs/02-ARCHITECTURE.md`
- [ ] Update `PORT-ALLOCATION.md` (remove ports 15511, 15513)
- [ ] Create `docs/USER-ROLES.md` documenting role-based access
- [ ] Update `docs/QUICK-START.md`

#### 6.3 Update Docker Configuration
- [ ] Remove `enduser-frontend` service from `docker-compose.yml`
- [ ] Remove `official-frontend` service from `docker-compose.yml`
- [ ] Update port mappings (keep only 15510 for frontend)

#### 6.4 Update CI/CD (if applicable)
- [ ] Remove build steps for old frontends
- [ ] Update deployment scripts

**Deliverable**: Old code removed, documentation updated

---

## 🔄 **Rollback Plan**

If migration fails at any phase:

1. **Keep backup branch**: `backup/pre-consolidation-YYYYMMDD`
2. **Revert strategy**: 
   ```bash
   git checkout main
   git branch -D feature/frontend-consolidation
   git checkout backup/pre-consolidation-YYYYMMDD
   ```
3. **Test rollback**: Ensure all three frontends work as before

---

## ✅ **Success Criteria**

- [ ] All three user types can log in and access their routes
- [ ] Route guards prevent unauthorized access
- [ ] No code duplication (shared code in single location)
- [ ] All existing functionality works
- [ ] All E2E tests pass
- [ ] Documentation updated
- [ ] Old frontends removed
- [ ] Docker config updated
- [ ] Port allocation updated

---

## 📅 **Timeline Summary**

| Phase | Duration | Days | Status |
|-------|----------|------|--------|
| Phase 0: Preparation | 1 day | Day 1 | ⏳ Pending |
| Phase 1: Shared Code | 2 days | Days 2-3 | ⏳ Pending |
| Phase 2: Route Guards | 2 days | Days 4-5 | ⏳ Pending |
| Phase 3: Route Migration | 3 days | Days 6-8 | ⏳ Pending |
| Phase 4: Layout Updates | 2 days | Days 9-10 | ⏳ Pending |
| Phase 5: Testing | 2 days | Days 11-12 | ⏳ Pending |
| Phase 6: Cleanup | 2 days | Days 13-14 | ⏳ Pending |

**Total Estimated Time**: **14 days** (2-3 weeks)

---

## 🚀 **Getting Started**

1. **Review this plan** with team
2. **Create migration branch**: `git checkout -b feature/frontend-consolidation`
3. **Start with Phase 0**: Preparation & Setup
4. **Proceed phase by phase**: Don't skip steps
5. **Test after each phase**: Ensure nothing breaks
6. **Document any deviations**: Update this plan if needed

---

## 📝 **Notes**

- **Incremental approach**: Each phase is independent and testable
- **No big bang**: Migration happens gradually
- **Rollback possible**: Can revert at any point
- **Preserve functionality**: All existing features must work
- **Follow Janus 2.0 principles**: Keep it simple, direct, and fast

---

**Last Updated**: 2025-01-30  
**Created By**: Architecture Review  
**Status**: Ready for Implementation

