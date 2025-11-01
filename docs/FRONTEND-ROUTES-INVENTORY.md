# Frontend Routes Inventory

**Created**: 2025-01-30  
**Purpose**: Document all routes from three frontends before consolidation  
**Status**: Phase 0 - Preparation

---

## Admin Frontend (`frontend/`) - Port 15510

### Routes Structure
```
routes/
├── __root.tsx              # Root layout wrapper
├── index.tsx                # Redirects to /dashboard or /login
├── login.tsx                # Login page (redirects to /personnel after login)
├── dashboard.tsx            # Admin dashboard
├── profile.tsx              # User profile settings
├── tasks.tsx                # Tasks page (may be unused)
├── access/
│   ├── index.tsx            # Access control list
│   └── view.tsx             # View access details
├── audit/
│   └── index.tsx            # Audit log viewer
├── info-systems.tsx         # Information Systems CRUD
├── ndas/
│   └── index.tsx            # NDA management
├── personnel/
│   ├── index.tsx            # Personnel list
│   └── $personnelId.tsx     # Personnel detail view
├── roles/
│   └── index.tsx            # Role management
└── vendors/
    ├── index.tsx            # Vendor list
    └── $vendorId.tsx        # Vendor detail view
```

### Route Details

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/` | `index.tsx` | Redirects to `/dashboard` or `/login` | No |
| `/login` | `login.tsx` | Login form | No |
| `/dashboard` | `dashboard.tsx` | Admin dashboard | Yes |
| `/profile` | `profile.tsx` | User profile settings | Yes |
| `/tasks` | `tasks.tsx` | Tasks page (may be unused) | Yes |
| `/access` | `access/index.tsx` | Access control list | Yes |
| `/access/view` | `access/view.tsx` | View access details | Yes |
| `/audit` | `audit/index.tsx` | Audit log viewer | Yes |
| `/info-systems` | `info-systems.tsx` | Info Systems CRUD | Yes |
| `/ndas` | `ndas/index.tsx` | NDA management | Yes |
| `/personnel` | `personnel/index.tsx` | Personnel list | Yes |
| `/personnel/$personnelId` | `personnel/$personnelId.tsx` | Personnel detail | Yes |
| `/roles` | `roles/index.tsx` | Role management | Yes |
| `/vendors` | `vendors/index.tsx` | Vendor list | Yes |
| `/vendors/$vendorId` | `vendors/$vendorId.tsx` | Vendor detail | Yes |

---

## End User Frontend (`enduser-frontend/`) - Port 15511

### Routes Structure
```
routes/
├── __root.tsx              # Root layout wrapper
├── index.tsx                # Redirects to /tasks or /login
├── login.tsx                # Login page (redirects to /tasks after login)
├── profile.tsx              # User profile settings
└── tasks.tsx                # Task management (NDAs, documents)
```

### Route Details

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/` | `index.tsx` | Redirects to `/tasks` or `/login` | No |
| `/login` | `login.tsx` | Login form | No |
| `/tasks` | `tasks.tsx` | Task management (NDAs, docs) | Yes |
| `/profile` | `profile.tsx` | User profile settings | Yes |

### Features in Tasks Route
- View pending NDAs
- Sign NDAs
- Reject NDAs (with reason)
- View document references
- Upload document attachments

---

## Official Frontend (`official-frontend/`) - Port 15513

### Routes Structure
```
routes/
├── __root.tsx              # Root layout wrapper
├── index.tsx                # Redirects to /dashboard or /login
├── login.tsx                # Login page (redirects to /dashboard after login)
├── dashboard.tsx            # Official dashboard
├── personnel.tsx            # Personnel lookup (read-only)
└── vendors.tsx              # Vendor lookup (read-only)
```

### Route Details

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/` | `index.tsx` | Redirects to `/dashboard` or `/login` | No |
| `/login` | `login.tsx` | Login form | No |
| `/dashboard` | `dashboard.tsx` | Official dashboard | Yes |
| `/personnel` | `personnel.tsx` | Personnel lookup (read-only) | Yes |
| `/vendors` | `vendors.tsx` | Vendor lookup (read-only) | Yes |

### Features
- **Read-only access** - No edit/create/delete capabilities
- Personnel search and lookup
- Vendor search and lookup
- Clearance level verification

---

## Route Conflicts Analysis

### No Conflicts Identified
- Admin routes: `/personnel`, `/vendors`, `/dashboard`, `/info-systems`, etc.
- End User routes: `/tasks`, `/profile`
- Official routes: `/personnel`, `/vendors`, `/dashboard` (read-only)

**Resolution Strategy**: 
- Admin routes will move to `/admin/*` prefix
- End User routes will move to `/enduser/*` prefix
- Official routes will move to `/official/*` prefix

---

## Route Dependencies

### Shared Routes (All Three Frontends)
- `/login` - Login page (nearly identical)
- `/profile` - Profile settings (similar)

### Admin-Specific Routes
- All CRUD operations
- Audit logs
- Access control
- Role management
- Info Systems
- NDA management

### End User-Specific Routes
- `/tasks` - Task management (unique)

### Official-Specific Routes
- Read-only versions of Personnel and Vendors

---

## Navigation Patterns

### Admin Frontend Navigation
- Dashboard
- Personnel
- Vendors
- Info Systems
- Access Control
- NDAs
- Audit Logs
- Roles

### End User Frontend Navigation
- My Tasks
- Profile

### Official Frontend Navigation
- Dashboard
- Personnel Lookup
- Vendor Lookup

---

## Target Route Structure (After Migration)

```
/login                          # Unified login
/
├── /admin/*                    # Admin routes
│   ├── /admin/dashboard
│   ├── /admin/personnel/*
│   ├── /admin/vendors/*
│   ├── /admin/info-systems
│   ├── /admin/access/*
│   ├── /admin/ndas/*
│   ├── /admin/audit
│   └── /admin/roles
├── /enduser/*                  # End User routes
│   ├── /enduser/tasks
│   └── /enduser/profile
└── /official/*                  # Official routes
    ├── /official/dashboard
    ├── /official/personnel
    └── /official/vendors
```

---

**Next Steps**: Use this inventory to guide Phase 3 (Route Migration)

