# Janus 2.0 - Quick Test Summary

## 🚀 What Should Work

### ✅ Core Features (Fully Implemented)

1. **Authentication & Authorization**
   - Login/Logout (JWT-based)
   - Role-based access control (4 default roles: admin, manager, operator, viewer)
   - Permission-based authorization (roles.read, roles.write, audit.read, etc.)
   - Profile management
   - Password change

2. **Personnel Management**
   - CRUD operations (Create, Read, Update, Delete)
   - Inline editing
   - Pagination
   - Clearance level management

3. **Vendor Management**
   - CRUD operations
   - Vendor hierarchy (parent-child relationships)
   - Vendor relations management

4. **Roles & Permissions** ⭐ **NEW**
   - Create, edit, delete roles
   - Assign permissions to roles
   - Permission grouping by resource
   - Default roles seeded (admin, manager, operator, viewer)

5. **Access Control (Three-Tier)**
   - Grant computer access (system-level)
   - Grant data access (classification-based)
   - Grant physical access (zone-based)
   - View all access grants for personnel
   - Revoke access

6. **Information Systems**
   - CRUD operations
   - Environment tracking (PRODUCTION/STAGING/DEVELOPMENT)

7. **Audit Logging**
   - View all audit entries
   - Filter by username, action, resource type
   - Pagination

8. **NDA Management**
   - Admin: Create/send NDAs to personnel
   - End-user: Sign/reject NDAs
   - Track status (PENDING, SIGNED, REJECTED, EXPIRED)
   - Track rejection reasons

9. **Discussions (End-User Portal)**
   - Create discussions/reports
   - Reply to discussions
   - View discussion history

10. **Document References (End-User Portal)**
    - Add physical document references
    - View signed NDAs as documents
    - Upload attachments (S3/MinIO)

---

## 🧪 Manual Testing Quick Guide

### Start Services
```bash
# Backend
cd backend && cargo run

# Frontend (Admin)
cd frontend && npm run dev

# Frontend (End User)
cd enduser-frontend && npm run dev
```

### Test Credentials
- **Admin**: `admin` / `password123` (all permissions)
- **Manager**: `manager` / `password123` (business objects)
- **Operator**: `operator` / `password123` (read-only)
- **Viewer**: `viewer` / `password123` (read-only)

### Key URLs
- **Admin Frontend**: http://localhost:15510
- **End User Portal**: http://localhost:15514
- **Backend API**: http://localhost:15520
- **Health Check**: http://localhost:15520/api/health

---

## ✅ Critical Test Scenarios

### 1. Roles & Permissions (New Feature)
**URL**: http://localhost:15510/roles

**Steps**:
1. Login as `admin`
2. Navigate to "Roles & Permissions"
3. Click "Create Role" → Name: "auditor"
4. Click "Permissions" on "auditor" role
5. Check `audit.read` permission
6. Click "Save Permissions"
7. Verify permission is assigned

**Expected**: Role created, permission assigned successfully

---

### 2. Personnel Management
**URL**: http://localhost:15510/personnel

**Steps**:
1. View personnel list
2. Click "Add Personnel"
3. Fill in: First Name, Last Name, Email, Department, Position, Clearance
4. Click "Add"
5. Click edit icon on new personnel
6. Modify position → Save
7. Verify changes persisted

**Expected**: Create, edit work correctly

---

### 3. Access Control
**URL**: http://localhost:15510/access

**Steps**:
1. Select personnel from dropdown
2. Click "Grant Computer Access"
3. Select info system and access level
4. Submit
5. Navigate to "View Access"
6. Select same personnel
7. Verify access grant appears

**Expected**: Access granted and visible

---

### 4. End User Portal
**URL**: http://localhost:15514

**Steps**:
1. Login with end-user credentials
2. View Security Folder (should show signed NDAs)
3. Click "Add Document"
4. Fill in document form → Submit
5. Verify document appears in Security Folder
6. Click on document → View details dialog

**Expected**: Documents visible and manageable

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Can't login | Check backend running on port 15520 |
| 404 errors | Check frontend routes exist |
| Permission denied | Verify role has correct permissions assigned |
| Database errors | Run migrations: `sqlx migrate run` |
| CORS errors | Backend should allow all origins in dev mode |

---

## 📊 Feature Status Matrix

| Feature | Backend | Frontend | E2E Tests | Status |
|---------|---------|----------|-----------|--------|
| Authentication | ✅ | ✅ | ✅ | Complete |
| Personnel CRUD | ✅ | ✅ | ✅ | Complete |
| Vendor CRUD | ✅ | ✅ | ✅ | Complete |
| Roles & Permissions | ✅ | ✅ | ✅ | Complete |
| Access Control | ✅ | ✅ | ✅ | Complete |
| Audit Logs | ✅ | ✅ | ✅ | Complete |
| Info Systems | ✅ | ✅ | ❌ | Complete |
| NDAs | ✅ | ✅ | ❌ | Complete |
| Discussions | ✅ | ✅ | ❌ | Complete |
| Document References | ✅ | ✅ | ❌ | Complete |

---

## 🎯 Next Steps for Testing

1. **Run E2E Tests**:
   ```bash
   cd frontend
   npm run test:e2e
   ```

2. **Manual Smoke Test**:
   - Test each major feature (Personnel, Vendors, Roles, Access)
   - Verify permission enforcement
   - Test end-user portal

3. **API Testing**:
   - Use curl or Postman to test API endpoints
   - Verify JWT authentication
   - Test permission checks

---

**For detailed testing instructions, see**: [TESTING-GUIDE.md](./TESTING-GUIDE.md)

