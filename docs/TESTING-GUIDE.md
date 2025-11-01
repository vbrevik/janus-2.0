# Janus 2.0 - Manual Testing Guide

## Overview

This document provides a comprehensive guide for manually testing all implemented features in Janus 2.0.

---

## Prerequisites

1. **Services Running**:
   - Backend: `http://localhost:15520`
   - Frontend (Admin): `http://localhost:15510`
   - Frontend (End User): `http://localhost:15514`
   - Frontend (Official): `http://localhost:15515`
   - PostgreSQL: `localhost:15530`

2. **Test Credentials**:
   - Admin: `admin` / `password123`
   - Manager: `manager` / `password123`
   - Operator: `operator` / `password123`
   - Viewer: `viewer` / `password123`

---

## 1. Authentication & Authorization

### 1.1 Login
**What to Test**:
- ✅ Navigate to `http://localhost:15510`
- ✅ Should redirect to `/login` if not authenticated
- ✅ Login with valid credentials (`admin` / `password123`)
- ✅ Should redirect to `/personnel` after successful login
- ✅ Should show user info in header (username and role)
- ✅ Try invalid credentials - should show error message
- ✅ Try logging out - should redirect to login

**Expected Results**:
- Login successful → Redirects to personnel page
- Invalid credentials → Error message displayed, stays on login page
- Logout → Redirects to login, session cleared

---

## 2. Personnel Management

### 2.1 Personnel List
**URL**: `http://localhost:15510/personnel`

**What to Test**:
- ✅ View list of personnel in table format
- ✅ See columns: Name, Email, Department, Position, Clearance Level
- ✅ Pagination controls (if more than 10-20 items)
- ✅ Inline editing:
  - Click edit icon (pencil) on any row
  - Modify fields (name, email, department, position, clearance)
  - Click Save (checkmark) or Cancel (X)
  - Changes should persist after save
- ✅ Create new personnel:
  - Click "Add Personnel" button
  - Fill in required fields (first name, last name, email, department, position, clearance)
  - Optional: phone number
  - Click "Add" button
  - New personnel should appear in table
- ✅ Delete personnel:
  - Click trash icon on any row
  - Personnel should be soft-deleted (disappears from list)

**Expected Results**:
- Table displays all personnel with correct data
- Edits save successfully
- New personnel appears immediately
- Deleted personnel removed from list

---

## 3. Vendor Management

### 3.1 Vendor List
**URL**: `http://localhost:15510/vendors`

**What to Test**:
- ✅ View list of vendors in table format
- ✅ See columns: Name, Type, Clearance, Contact Email, Actions
- ✅ Inline editing (similar to personnel)
- ✅ Create new vendor:
  - Click "Add Vendor" button
  - Fill in: name (required), type (CONTRACTOR/SUPPLIER/PARTNER/INTERNAL), clearance level
  - Optional: parent vendor (for hierarchy), contact email, phone, address
  - Save
- ✅ Delete vendor (soft delete)
- ✅ Navigate to vendor detail page (click vendor name)

**Expected Results**:
- All CRUD operations work correctly
- Vendor hierarchy can be established via parent vendor selection

---

## 4. Roles & Permissions Management

### 4.1 Roles List
**URL**: `http://localhost:15510/roles`

**What to Test**:
- ✅ View list of roles (should show: admin, manager, operator, viewer by default)
- ✅ Create new role:
  - Click "Create Role" button
  - Enter role name (e.g., "auditor")
  - Optional: description
  - Click "Create Role"
  - New role appears in table
- ✅ Edit existing role:
  - Click edit icon (pencil) on any role
  - Modify name or description
  - Click Save or Cancel
- ✅ Delete role:
  - Click trash icon
  - Confirm deletion
  - Role removed from list
- ✅ Manage permissions for role:
  - Click "Permissions" button on any role
  - Dialog opens showing all available permissions grouped by resource
  - Check/uncheck permissions
  - Click "Select All" / "Deselect All" to toggle all
  - Click "Save Permissions"
  - Changes should persist

**Expected Results**:
- Default roles visible (admin, manager, operator, viewer)
- Can create, edit, delete custom roles
- Permission assignment works correctly
- Permissions grouped by resource (audit, personnel, vendors, roles, etc.)

**Permission Categories** (should be visible):
- `audit.read`, `audit.write`
- `personnel.read`, `personnel.write`
- `vendors.read`, `vendors.write`
- `roles.read`, `roles.write`

---

## 5. Access Control

### 5.1 Grant Access
**URL**: `http://localhost:15510/access`

**What to Test**:
- ✅ Select personnel from dropdown
- ✅ Choose access type (Computer, Data, or Physical)
- ✅ Grant Computer Access:
  - Select information system
  - Select access level (READ, WRITE, ADMIN)
  - Optional: expiration date
  - Submit
- ✅ Grant Data Access:
  - Select data classification (UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET)
  - Select access level (READ, WRITE, DELETE)
  - Optional: expiration date
  - Submit
- ✅ Grant Physical Access:
  - Enter zone name
  - Select access level (VISITOR, STANDARD, RESTRICTED, FULL)
  - Set valid from/until dates
  - Submit

**Expected Results**:
- Access grants successfully created
- Validation: Can't grant access with expired date
- Clearance level requirements enforced

### 5.2 View Access
**URL**: `http://localhost:15510/access/view`

**What to Test**:
- ✅ Select personnel from dropdown
- ✅ Click "View Access"
- ✅ Should display all access grants for that personnel:
  - Computer access grants
  - Data access grants
  - Physical access grants
- ✅ Each access type shows:
  - System/Zone/Classification
  - Access level
  - Status (ACTIVE, REVOKED, EXPIRED)
  - Dates (granted, expires)

**Expected Results**:
- All three types of access displayed
- Correct status shown
- Dates formatted correctly

---

## 6. Information Systems Management

### 6.1 Info Systems List
**URL**: `http://localhost:15510/info-systems`

**What to Test**:
- ✅ View list of information systems
- ✅ Create new system:
  - Click "Add Info System"
  - Fill in: system name, description, environment (PRODUCTION/STAGING/DEVELOPMENT), status
  - Optional: IP address, domain, managed by
  - Save
- ✅ Edit existing system
- ✅ Delete system

**Expected Results**:
- Systems listed with all details
- CRUD operations work correctly

---

## 7. Audit Logs

### 7.1 Audit Log Viewer
**URL**: `http://localhost:15510/audit`

**What to Test**:
- ✅ View audit log entries in table
- ✅ Filter by:
  - Username
  - Action type
  - Resource type
- ✅ See columns:
  - Timestamp
  - Username
  - Action
  - Resource Type
  - Resource ID
  - Changes (JSON)
- ✅ Pagination controls

**Expected Results**:
- All actions logged (create, update, delete)
- Filters work correctly
- JSON changes displayed properly

**Note**: Requires `audit.read` permission (admin role has this by default)

---

## 8. NDA Management (Admin Frontend)

### 8.1 Send NDA
**URL**: `http://localhost:15510/personnel/:id` (Personnel Details page, NDA tab)

**What to Test**:
- ✅ Navigate to personnel details page
- ✅ Click "NDAs" tab
- ✅ Click "Send NDA" button
- ✅ Fill in:
  - Title (required)
  - Content/Description
  - Optional: Expiration date
  - Optional: Select vendor (if sent by vendor)
- ✅ Submit
- ✅ NDA appears in list with status "PENDING"

**Expected Results**:
- NDA created with correct personnel ID
- Status shows as "PENDING"
- Sent date recorded if vendor selected

### 8.2 View NDA Status
**What to Test**:
- ✅ In NDA list, see columns:
  - Title
  - Status (PENDING, SIGNED, REJECTED, EXPIRED)
  - Sent date (if vendor sent)
  - Signed date (if signed)
  - Rejection reason (if rejected)
- ✅ Click on NDA to view details

**Expected Results**:
- All NDA metadata displayed correctly
- Status transitions visible

---

## 9. End User Portal

### 9.1 Login & Tasks Page
**URL**: `http://localhost:15514`

**What to Test**:
- ✅ Login with end-user credentials
- ✅ Should see "Tasks" page with two sections:
  - **Security Folder** (left column)
  - **Inbox** (right column)

### 9.2 Security Folder
**What to Test**:
- ✅ View signed NDAs (clickable documents)
- ✅ See physical documents (self-reported):
  - Blue left border
  - FileSearch icon
  - Document type, issued date, location
  - Status badge
- ✅ Add new document:
  - Click "Add Document" button
  - Fill in form:
    - Title (required)
    - Document Type (dropdown)
    - Description
    - Issued Date (optional)
    - Location (optional)
    - Notes (optional)
  - Submit
  - Document appears in Security Folder
- ✅ Click document to view full details in dialog

**Expected Results**:
- NDAs appear as clickable documents when signed
- Physical documents display correctly
- Can add new documents
- Documents linked to user's personnel record (via email matching)

### 9.3 Inbox (Discussions)
**What to Test**:
- ✅ View discussions/reports
- ✅ Create new discussion:
  - Click "New Discussion" button
  - Enter subject and message
  - Submit
- ✅ View discussion details
- ✅ Add replies to discussions

**Expected Results**:
- Discussions list displays correctly
- Can create and reply to discussions
- Admin users can see end-user discussions

---

## 10. Profile Management

### 10.1 Profile Settings
**URL**: `http://localhost:15510/profile`

**What to Test**:
- ✅ View current user profile:
  - Username
  - Role
  - Email (if linked to personnel)
  - Phone (if linked to personnel)
- ✅ Edit contact information:
  - Update email
  - Update phone
  - Save changes
- ✅ Change password:
  - Enter current password
  - Enter new password
  - Confirm new password
  - Submit
  - Should require re-login with new password

**Expected Results**:
- Profile displays correctly
- Contact info updates successfully
- Password change requires current password verification

---

## 11. Navigation & Layout

### 11.1 Navigation Menu
**What to Test**:
- ✅ All navigation links work:
  - Dashboard
  - Personnel
  - Vendors
  - Access Control
  - View Access
  - Info Systems
  - Audit Logs
  - **Roles & Permissions** (new)
- ✅ Active page highlighted in navigation
- ✅ User dropdown menu:
  - Profile Settings
  - Change Password
  - Logout

**Expected Results**:
- All links navigate correctly
- Active state shows current page
- Dropdown menu functions properly

---

## 12. Permission-Based Access Control

### 12.1 Test Permission Enforcement
**What to Test**:
- ✅ Login as `viewer` (has limited permissions)
- ✅ Try to access `/roles` page
  - Should either:
    - Show 403 error, OR
    - Show page but disable write operations, OR
    - Hide the link entirely
- ✅ Try to create/edit/delete roles
  - Should be blocked if no `roles.write` permission
- ✅ Check audit logs
  - Should be blocked if no `audit.read` permission

**Expected Results**:
- Permissions enforced correctly
- Users without permissions can't perform restricted actions
- Error messages clear (403 Forbidden)

---

## 13. API Endpoints (Direct Testing)

### 13.1 Health Check
```bash
curl http://localhost:15520/api/health
```
**Expected**: JSON response with status, version, port, database

### 13.2 Authentication
```bash
# Login
curl -X POST http://localhost:15520/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```
**Expected**: JSON with JWT token

```bash
# Get Profile (use token from login)
curl http://localhost:15520/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

### 13.3 Roles & Permissions
```bash
# List Roles
curl http://localhost:15520/api/roles \
  -H "Authorization: Bearer <token>"

# List Permissions
curl http://localhost:15520/api/roles/permissions \
  -H "Authorization: Bearer <token>"

# Get Role Permissions
curl http://localhost:15520/api/roles/1/permissions \
  -H "Authorization: Bearer <token>"

# Create Role
curl -X POST http://localhost:15520/api/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"testrole","description":"Test role"}'
```

---

## 14. E2E Test Scenarios

The following scenarios are covered by automated E2E tests and can also be tested manually:

### 14.1 Complete Personnel Workflow
1. Login → Navigate to Personnel
2. Create new personnel
3. Edit personnel details
4. View personnel detail page
5. Delete personnel

### 14.2 Complete Vendor Workflow
1. Login → Navigate to Vendors
2. Create new vendor
3. Edit vendor details
4. Create vendor relation (parent-child)
5. View vendor hierarchy

### 14.3 Complete Roles & Permissions Workflow
1. Login → Navigate to Roles & Permissions
2. Create new role
3. Edit role details
4. Assign permissions to role
5. Verify permissions assigned correctly

### 14.4 Access Control Workflow
1. Login → Navigate to Access Control
2. Select personnel
3. Grant computer access
4. Grant data access
5. Grant physical access
6. View all access grants

---

## 15. Known Limitations & Notes

### 15.1 Features Not Yet Implemented
- ❌ User-role assignment UI (roles exist but user assignment is manual via database)
- ❌ Permission inheritance/hierarchies
- ❌ Audit logging for permission changes
- ❌ Export functionality (CSV/PDF)
- ❌ Advanced search/filtering

### 15.2 Browser Compatibility
- Tested on: Chrome, Firefox, Safari (latest versions)
- Requires: JavaScript enabled, modern browser

### 15.3 Database Requirements
- PostgreSQL 15+
- All migrations must be run (`sqlx migrate run`)

---

## 16. Quick Test Checklist

**Core Features** (MVP 1):
- [ ] Login/Logout works
- [ ] Personnel CRUD works
- [ ] Vendor CRUD works
- [ ] Roles & Permissions management works
- [ ] Permission assignment works
- [ ] Access control grants work
- [ ] Audit logs visible
- [ ] Navigation works

**Extended Features**:
- [ ] NDA management (admin)
- [ ] NDA signing (end-user)
- [ ] Discussions (end-user)
- [ ] Document references (end-user)
- [ ] Profile management
- [ ] Password change

---

## 17. Troubleshooting

### Issue: Can't login
- **Check**: Backend running on port 15520
- **Check**: Database connection in backend logs
- **Check**: Credentials match seeded users

### Issue: Permissions not working
- **Check**: User has correct role
- **Check**: Role has permissions assigned (via Roles & Permissions page)
- **Check**: Backend logs for permission check errors

### Issue: 404 on routes
- **Check**: Frontend running on port 15510
- **Check**: Route exists in `frontend/src/routes/`
- **Check**: Route properly exported

### Issue: API errors
- **Check**: Backend logs (`/tmp/janus-backend.log` or console)
- **Check**: Database migrations run
- **Check**: CORS configuration (should allow all origins in dev)

---

**Last Updated**: 2025-01-30  
**Version**: 2.0.0

