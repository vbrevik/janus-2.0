# Roles & Permissions Feature - User Stories (EARS Format)

**Feature**: Role-Based Access Control (RBAC) System  
**Created**: 2025-01-30  
**Status**: Implemented  
**Management Guide**: See [USER-STORIES-MANAGEMENT.md](./USER-STORIES-MANAGEMENT.md)

---

## Overview

This document contains user stories for the Roles & Permissions feature, formatted using the **Easy Approach to Requirements Syntax (EARS)**. The feature enables fine-grained access control through roles and permissions, replacing simple role-based checks with permission-based authorization.

**Note**: This document follows the management guidelines in [USER-STORIES-MANAGEMENT.md](./USER-STORIES-MANAGEMENT.md) for tracking status, implementation details, and lifecycle management.

---

## Core Permission System

### US-001: Permission Check Mechanism

**Status**: ✅ Implemented

**AS A** system component  
**WHEN** checking if a user can perform an action  
**IF** the user's role has the required permission assigned  
**THE SYSTEM SHALL** allow the action  
**OTHERWISE THE SYSTEM SHALL** deny access with an unauthorized error

**Acceptance Criteria:**
- ✅ Permission checks query the `role_permissions` join table
- ✅ Cache-friendly database queries for performance
- ✅ Returns boolean result with error handling

**Implementation:**
- Backend: `backend/src/shared/rbac.rs` - `role_has_permission()` function

---

## Audit Log Access (Permission-Based)

### US-002: View Audit Log List

**Status**: ✅ Implemented

**AS AN** authenticated user  
**WHEN** I request to view the audit log list  
**IF** I have the `audit.read` permission  
**THE SYSTEM SHALL** return paginated audit log entries with filtering options  
**OTHERWISE THE SYSTEM SHALL** return a 403 Forbidden error

**EARS Format:**
```
IF a user has 'audit.read' permission
WHEN they request GET /api/audit
THE SYSTEM SHALL return paginated audit logs with optional filters (username, action, resource_type)
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

**Acceptance Criteria:**
- Admin role has `audit.read` by default
- Manager role can be granted `audit.read` if needed
- Operator and Viewer roles do not have `audit.read` by default
- Pagination supports page and per_page parameters
- Filtering by username, action, and resource_type works correctly

### US-003: View Single Audit Log Entry

**AS AN** authenticated user  
**WHEN** I request a specific audit log entry by ID  
**IF** I have the `audit.read` permission  
**THE SYSTEM SHALL** return the complete audit log entry details  
**OTHERWISE THE SYSTEM SHALL** return a 403 Forbidden error

**EARS Format:**
```
IF a user has 'audit.read' permission
WHEN they request GET /api/audit/{id}
THE SYSTEM SHALL return the audit log entry with all fields
WHERE the entry does not exist
THE SYSTEM SHALL return AppError::NotFound
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

---

## Role Management

### US-004: List All Roles

**AS AN** admin user  
**WHEN** I request the list of roles  
**IF** I have the `roles.read` permission  
**THE SYSTEM SHALL** return all roles sorted by name  
**OTHERWISE THE SYSTEM SHALL** return a 403 Forbidden error

**EARS Format:**
```
IF a user has 'roles.read' permission
WHEN they request GET /api/roles
THE SYSTEM SHALL return an array of all roles with id, name, description, created_at
WHERE roles are sorted alphabetically by name
```

**Acceptance Criteria:**
- Returns JSON array of Role objects
- Admin role has `roles.read` permission
- Response includes role ID, name, description, and creation timestamp

### US-005: Create New Role

**AS AN** admin user  
**WHEN** I create a new role with name and optional description  
**IF** I have the `roles.write` permission AND the role name is unique  
**THE SYSTEM SHALL** create the role and return the created role object  
**OTHERWISE THE SYSTEM SHALL** return an error (unauthorized or duplicate name)

**EARS Format:**
```
IF a user has 'roles.write' permission
WHEN they POST to /api/roles with {name, description}
THE SYSTEM SHALL create the role in the database
WHERE the role name already exists
THE SYSTEM SHALL return a database constraint error
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

**Acceptance Criteria:**
- Role name must be unique (enforced by database constraint)
- Description is optional
- Created role has auto-generated ID and timestamp
- Default roles (admin, manager, operator, viewer) cannot be accidentally overwritten if protected

### US-006: Update Existing Role

**AS AN** admin user  
**WHEN** I update a role's name or description  
**IF** I have the `roles.write` permission AND the role exists  
**THE SYSTEM SHALL** update the role and return the updated object  
**OTHERWISE THE SYSTEM SHALL** return an error (unauthorized or not found)

**EARS Format:**
```
IF a user has 'roles.write' permission
WHEN they PUT to /api/roles/{id} with {name?, description?}
THE SYSTEM SHALL update the role fields (partial update supported)
WHERE the role does not exist
THE SYSTEM SHALL return AppError::NotFound
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

**Acceptance Criteria:**
- Partial updates supported (only provided fields are updated)
- Role name uniqueness enforced if changed
- Returns updated role object with all fields

### US-007: Delete Role

**AS AN** admin user  
**WHEN** I delete a role by ID  
**IF** I have the `roles.write` permission AND the role exists  
**THE SYSTEM SHALL** delete the role and all associated permission assignments  
**OTHERWISE THE SYSTEM SHALL** return an error (unauthorized or not found)

**EARS Format:**
```
IF a user has 'roles.write' permission
WHEN they DELETE /api/roles/{id}
THE SYSTEM SHALL delete the role and cascade delete role_permissions entries
WHERE the role does not exist
THE SYSTEM SHALL return AppError::NotFound
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

**Acceptance Criteria:**
- Cascade deletes related `role_permissions` entries
- Users with deleted role become unauthorized (role column may need cleanup)
- Protected system roles should not be deletable (future enhancement)

---

## Permission Management

### US-008: List All Permissions

**AS AN** admin user  
**WHEN** I request the list of available permissions  
**IF** I have the `roles.read` permission  
**THE SYSTEM SHALL** return all permissions sorted by key  
**OTHERWISE THE SYSTEM SHALL** return a 403 Forbidden error

**EARS Format:**
```
IF a user has 'roles.read' permission
WHEN they request GET /api/roles/permissions
THE SYSTEM SHALL return an array of all permissions with id, key, description
WHERE permissions are sorted alphabetically by key
```

**Acceptance Criteria:**
- Returns all available permissions in the system
- Includes default permissions: audit.read, audit.write, personnel.read, personnel.write, organizations.read, organizations.write
- Response format: `{id, key, description}`

### US-009: Get Permissions for a Role

**AS AN** admin user  
**WHEN** I request permissions assigned to a specific role  
**IF** I have the `roles.read` permission AND the role exists  
**THE SYSTEM SHALL** return an array of permission keys for that role  
**OTHERWISE THE SYSTEM SHALL** return an error (unauthorized or not found)

**EARS Format:**
```
IF a user has 'roles.read' permission
WHEN they request GET /api/roles/{id}/permissions
THE SYSTEM SHALL return an array of permission keys (strings) for the role
WHERE the role does not exist
THE SYSTEM SHALL return AppError::NotFound
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

**Acceptance Criteria:**
- Returns array of permission key strings (e.g., `["audit.read", "personnel.read"]`)
- Empty array if role has no permissions assigned
- Permissions sorted alphabetically

### US-010: Assign Permissions to Role

**AS AN** admin user  
**WHEN** I assign permissions to a role  
**IF** I have the `roles.write` permission AND the role exists  
**THE SYSTEM SHALL** replace all existing permissions with the provided set  
**OTHERWISE THE SYSTEM SHALL** return an error (unauthorized or not found)

**EARS Format:**
```
IF a user has 'roles.write' permission
WHEN they PUT to /api/roles/{id}/permissions with {permissions: ["perm1", "perm2"]}
THE SYSTEM SHALL:
  1. Delete all existing role_permissions for the role
  2. Insert new role_permissions for each valid permission key
  3. Return success
WHERE the role does not exist
THE SYSTEM SHALL return AppError::NotFound
WHERE an invalid permission key is provided
THE SYSTEM SHALL skip that key (gracefully handle)
WHERE no permission exists
THE SYSTEM SHALL return AppError::Unauthorized
```

**Acceptance Criteria:**
- Transaction-based operation (all or nothing)
- Invalid permission keys are silently skipped (not causing errors)
- Replaces permissions (does not append)
- Empty array removes all permissions from role
- Admin role should retain all permissions by default (protected in seed data)

---

## Database Schema

### US-011: Roles Table

**THE SYSTEM SHALL** maintain a `roles` table with the following structure:
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(50) UNIQUE NOT NULL)
- `description` (TEXT)
- `created_at` (TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)

**EARS Format:**
```
THE SYSTEM SHALL store roles in a 'roles' table
WHERE each role has a unique name constraint
WHERE roles have auto-generated IDs and timestamps
```

### US-012: Permissions Table

**THE SYSTEM SHALL** maintain a `permissions` table with the following structure:
- `id` (SERIAL PRIMARY KEY)
- `key` (VARCHAR(100) UNIQUE NOT NULL) - e.g., "audit.read"
- `description` (TEXT)

**EARS Format:**
```
THE SYSTEM SHALL store permissions in a 'permissions' table
WHERE each permission has a unique key constraint
WHERE permission keys follow the pattern 'resource.action' (e.g., 'audit.read')
```

### US-013: Role-Permission Mapping

**THE SYSTEM SHALL** maintain a `role_permissions` join table with:
- `role_id` (INTEGER REFERENCES roles(id) ON DELETE CASCADE)
- `permission_id` (INTEGER REFERENCES permissions(id) ON DELETE CASCADE)
- Composite PRIMARY KEY (role_id, permission_id)

**EARS Format:**
```
THE SYSTEM SHALL maintain many-to-many relationships between roles and permissions
WHERE deleting a role cascades to remove all permission assignments
WHERE deleting a permission cascades to remove all role assignments
WHERE duplicate assignments are prevented by composite primary key
```

---

## Default Roles and Permissions

### US-014: Default Role Seeding

**THE SYSTEM SHALL** seed default roles matching existing user roles:
- `admin` - Full access
- `manager` - Manage most resources
- `operator` - Operate daily tasks
- `viewer` - Read-only

**EARS Format:**
```
WHEN the database is initialized
THE SYSTEM SHALL create default roles that match existing user.role values
WHERE role names are: admin, manager, operator, viewer
WHERE duplicate seeding is prevented (ON CONFLICT DO NOTHING)
```

### US-015: Default Permission Seeding

**THE SYSTEM SHALL** seed default permissions for core features:
- `audit.read` - Read audit logs
- `audit.write` - Write audit entries programmatically
- `personnel.read` - Read personnel
- `personnel.write` - Write personnel
- `organizations.read` - Read organizations
- `organizations.write` - Write organizations

**EARS Format:**
```
WHEN the database is initialized
THE SYSTEM SHALL create default permissions for core features
WHERE permission keys follow the pattern 'resource.action'
WHERE duplicate seeding is prevented (ON CONFLICT DO NOTHING)
```

### US-016: Default Permission Assignment

**THE SYSTEM SHALL** assign default permissions to roles:

- **Admin**: All permissions (full access)
- **Manager**: audit.read, personnel.read, personnel.write, organizations.read, organizations.write
- **Operator**: personnel.read, organizations.read
- **Viewer**: personnel.read, organizations.read

**EARS Format:**
```
WHEN default roles are created
THE SYSTEM SHALL assign permissions to roles as follows:
  - admin role SHALL have all permissions
  - manager role SHALL have read/write for business objects and read for audit
  - operator role SHALL have read-only for business objects
  - viewer role SHALL have read-only for business objects
WHERE duplicate assignments are prevented (ON CONFLICT DO NOTHING)
```

---

## Integration Requirements

### US-017: Audit Log Integration

**WHEN** checking access to audit log endpoints  
**THE SYSTEM SHALL** use permission-based checks instead of hardcoded role checks  
**WHERE** the check queries `role_has_permission()` function  
**WHERE** the required permission is `audit.read`

**EARS Format:**
```
WHEN an audit log endpoint is accessed
THE SYSTEM SHALL check for 'audit.read' permission using role_has_permission()
WHERE the old hardcoded 'admin' role check is replaced
WHERE any role with 'audit.read' permission can access audit logs
```

### US-018: Error Handling

**WHEN** a permission check fails  
**THE SYSTEM SHALL** return `AppError::Unauthorized`  
**WHERE** the error is consistent across all permission-protected endpoints  
**WHERE** the HTTP status code is 403 Forbidden

**EARS Format:**
```
WHEN a user lacks required permission
THE SYSTEM SHALL return AppError::Unauthorized with HTTP 403
WHERE error messages are consistent across all endpoints
WHERE database errors are wrapped appropriately
```

---

## Performance Requirements

### US-019: Permission Check Performance

**WHEN** checking permissions  
**THE SYSTEM SHALL** execute a single optimized SQL query  
**WHERE** the query uses EXISTS for boolean result  
**WHERE** query time is < 10ms for typical workloads

**EARS Format:**
```
WHEN role_has_permission() is called
THE SYSTEM SHALL execute an EXISTS query joining roles, role_permissions, and permissions
WHERE the query is optimized with proper indexes
WHERE response time is acceptable for real-time authorization checks
```

---

## Future Enhancements (Not in Current Scope)

### US-020: User-Role Assignment UI

**AS AN** admin user  
**WHEN** I assign roles to users  
**THE SYSTEM SHALL** provide a UI for managing user-role assignments  
**NOTE**: This requires adding a `user_roles` join table

### US-021: Permission Inheritance

**AS A** system designer  
**WHEN** defining permissions  
**THE SYSTEM SHALL** support permission hierarchies  
**NOTE**: Future enhancement for complex permission structures

### US-022: Audit Logging for Permission Changes

**WHEN** permissions are assigned or removed  
**THE SYSTEM SHALL** create audit log entries  
**NOTE**: Currently permissions are managed but changes aren't audited

---

## Test Scenarios

### TS-001: Admin Can Access Audit Logs

**GIVEN** a user with admin role  
**WHEN** they request GET /api/audit  
**THEN** they receive audit logs successfully

### TS-002: Viewer Cannot Access Audit Logs

**GIVEN** a user with viewer role (no audit.read permission)  
**WHEN** they request GET /api/audit  
**THEN** they receive 403 Forbidden error

### TS-003: Manager Can Be Granted Audit Access

**GIVEN** a manager role exists  
**WHEN** admin assigns 'audit.read' permission to manager  
**THEN** manager role can access audit logs

### TS-004: Create Custom Role

**GIVEN** an admin user  
**WHEN** they create a role "auditor" with audit.read permission  
**THEN** users assigned to "auditor" role can view audit logs

---

## Acceptance Criteria Summary

✅ **Database Schema**
- Roles, permissions, and role_permissions tables created
- Default roles and permissions seeded
- Cascade delete behavior implemented

✅ **API Endpoints**
- GET /api/roles - List roles
- POST /api/roles - Create role
- PUT /api/roles/{id} - Update role
- DELETE /api/roles/{id} - Delete role
- GET /api/roles/permissions - List all permissions
- GET /api/roles/{id}/permissions - Get role permissions
- PUT /api/roles/{id}/permissions - Set role permissions

✅ **Permission Integration**
- Audit log endpoints use permission checks
- Permission helper function `role_has_permission()` implemented
- Error handling with AppError::Unauthorized

✅ **Default Configuration**
- Admin has all permissions
- Manager has business object permissions + audit.read (via assignment)
- Operator/Viewer have read-only business object permissions

---

## Change Log

### 2025-01-30
- Initial creation with 22 user stories (US-001 through US-022)
- Document status: Implemented (all stories complete)
- Added status indicators and implementation tracking (per USER-STORIES-MANAGEMENT.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-30  
**Author**: Full-Stack Developer Agent  
**Management**: See [USER-STORIES-MANAGEMENT.md](./USER-STORIES-MANAGEMENT.md) for lifecycle guidelines
