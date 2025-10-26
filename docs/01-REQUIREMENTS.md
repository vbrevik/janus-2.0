# Janus 2.0 - Comprehensive Requirements

## Document Purpose

This document provides **complete, precise, AI-readable requirements** for implementing Janus 2.0. Every requirement is **testable, measurable, and unambiguous**.

---

## 1. **System Overview**

### 1.1 Purpose
Janus 2.0 is a **security clearance and personnel management system** for air-gapped, high-security environments.

### 1.2 Core Functions
1. **Personnel Management** - Track personnel records, clearances, and assignments
2. **Vendor Management** - Manage vendor relationships and hierarchies
3. **Access Control** - Role-based access with three-tier security (Computer, Data, Physical)
4. **Audit & Compliance** - Complete audit trail and compliance reporting

### 1.3 Non-Functional Goals
- **Performance**: < 50ms API response time (p95)
- **Build Time**: < 30 seconds for backend, < 10 seconds for frontend
- **Deployment**: Single-command deployment
- **Maintenance**: Junior developer productive in 1 day
- **Reliability**: 99.9% uptime
- **Security**: Zero critical vulnerabilities

---

## 2. **Functional Requirements**

### 2.1 Authentication & Authorization

#### 2.1.1 User Authentication
**REQ-AUTH-001**: System MUST support username/password authentication
- **Input**: Username (string, 3-50 chars), Password (string, 8-128 chars)
- **Output**: JWT token (expires in 8 hours)
- **Security**: Passwords hashed with bcrypt (cost factor 12)
- **Rate Limit**: 5 attempts per 15 minutes per IP

**REQ-AUTH-002**: System MUST support session management
- **Token Format**: JWT with user ID, role, permissions
- **Token Expiry**: 8 hours of inactivity
- **Refresh**: Automatic refresh if activity within last hour
- **Revocation**: Support immediate token revocation

**REQ-AUTH-003**: System MUST log all authentication events
- **Events**: Login, logout, failed attempts, token refresh
- **Data**: User ID, IP address, timestamp, user agent
- **Retention**: 1 year minimum

#### 2.1.2 Role-Based Access Control (RBAC)
**REQ-RBAC-001**: System MUST support predefined roles
- **Roles**: SYSTEM_ADMIN, ADMIN, SECURITY_OFFICER, USER
- **Hierarchy**: SYSTEM_ADMIN > ADMIN > SECURITY_OFFICER > USER
- **Immutable**: Roles cannot be modified by users

**REQ-RBAC-002**: System MUST enforce role permissions
- **Permissions**: CREATE, READ, UPDATE, DELETE, APPROVE, AUDIT
- **Scope**: Per resource type (Personnel, Vendor, Access, System)
- **Enforcement**: At API level (not UI only)

**REQ-RBAC-003**: System MUST support role assignment
- **Assignment**: Only ADMIN and SYSTEM_ADMIN can assign roles
- **Audit**: All role changes logged
- **Validation**: Cannot remove last SYSTEM_ADMIN

### 2.2 Personnel Management

#### 2.2.1 Personnel CRUD Operations
**REQ-PERS-001**: System MUST support creating personnel records
- **Required Fields**: 
  - `firstName` (string, 1-50 chars)
  - `lastName` (string, 1-50 chars)
  - `email` (string, valid email format)
  - `clearanceLevel` (enum: NONE, CONFIDENTIAL, SECRET, TOP_SECRET)
- **Optional Fields**:
  - `middleName` (string, 0-50 chars)
  - `phone` (string, E.164 format)
  - `department` (string, 1-100 chars)
  - `position` (string, 1-100 chars)
  - `startDate` (date, ISO 8601)
  - `vendorId` (UUID, foreign key)
- **Validation**: Email must be unique
- **Permission**: Requires CREATE_PERSONNEL permission

**REQ-PERS-002**: System MUST support reading personnel records
- **Single**: GET `/api/personnel/{id}` returns full record
- **List**: GET `/api/personnel` returns paginated list (default 50 per page)
- **Filter**: Support filter by clearanceLevel, department, vendorId
- **Search**: Support full-text search on name and email
- **Permission**: Requires READ_PERSONNEL permission

**REQ-PERS-003**: System MUST support updating personnel records
- **Endpoint**: PUT `/api/personnel/{id}`
- **Validation**: Email must remain unique
- **Audit**: Log all changes with old and new values
- **Permission**: Requires UPDATE_PERSONNEL permission

**REQ-PERS-004**: System MUST support deleting personnel records
- **Type**: Soft delete (mark as deleted, don't physically delete)
- **Cascade**: Revoke all access when deleted
- **Audit**: Log deletion with reason
- **Permission**: Requires DELETE_PERSONNEL permission

#### 2.2.2 Clearance Management
**REQ-CLEAR-001**: System MUST support clearance levels
- **Levels**: NONE, CONFIDENTIAL, SECRET, TOP_SECRET
- **Hierarchy**: TOP_SECRET > SECRET > CONFIDENTIAL > NONE
- **Access Rule**: Higher clearance can access lower clearance data

**REQ-CLEAR-002**: System MUST track clearance history
- **Changes**: Log all clearance level changes
- **Data**: Old level, new level, changed by, timestamp, reason
- **Retention**: Permanent

**REQ-CLEAR-003**: System MUST support clearance expiration
- **Field**: `clearanceExpiry` (date, optional)
- **Warning**: Alert 30 days before expiry
- **Action**: Auto-revoke access on expiry date

### 2.3 Vendor Management

#### 2.3.1 Vendor CRUD Operations
**REQ-VEND-001**: System MUST support creating vendor records
- **Required Fields**:
  - `name` (string, 1-100 chars, unique)
  - `type` (enum: CONTRACTOR, SUPPLIER, PARTNER, INTERNAL)
  - `clearanceLevel` (enum: NONE, CONFIDENTIAL, SECRET, TOP_SECRET)
- **Optional Fields**:
  - `parentVendorId` (UUID, foreign key - for hierarchy)
  - `contactEmail` (string, valid email)
  - `contactPhone` (string, E.164 format)
  - `address` (string, 0-500 chars)
- **Permission**: Requires CREATE_VENDOR permission

**REQ-VEND-002**: System MUST support reading vendor records
- **Single**: GET `/api/vendors/{id}` returns full record with personnel count
- **List**: GET `/api/vendors` returns paginated list
- **Hierarchy**: GET `/api/vendors/{id}/children` returns child vendors
- **Personnel**: GET `/api/vendors/{id}/personnel` returns assigned personnel
- **Permission**: Requires READ_VENDOR permission

**REQ-VEND-003**: System MUST support updating vendor records
- **Endpoint**: PUT `/api/vendors/{id}`
- **Validation**: Name must remain unique
- **Audit**: Log all changes
- **Permission**: Requires UPDATE_VENDOR permission

**REQ-VEND-004**: System MUST support deleting vendor records
- **Type**: Soft delete if has associated personnel, hard delete if empty
- **Validation**: Cannot delete if has child vendors
- **Personnel**: Reassign personnel to null before deletion
- **Permission**: Requires DELETE_VENDOR permission

#### 2.3.2 Vendor Hierarchy
**REQ-HIER-001**: System MUST support vendor hierarchies
- **Structure**: Tree structure (parent-child relationships)
- **Depth**: Maximum 5 levels deep
- **Query**: Support recursive queries to get all descendants

**REQ-HIER-002**: System MUST prevent circular hierarchies
- **Validation**: Check parent chain before setting parentVendorId
- **Error**: Return 400 Bad Request if circular reference detected

### 2.4 Three-Tier Access Control

#### 2.4.1 Computer Access
**REQ-COMP-001**: System MUST support computer access records
- **Fields**:
  - `personnelId` (UUID, foreign key)
  - `systemName` (string, 1-100 chars)
  - `accessLevel` (enum: READ, WRITE, ADMIN)
  - `grantedBy` (UUID, user ID)
  - `grantedAt` (timestamp)
  - `expiresAt` (timestamp, optional)
  - `status` (enum: ACTIVE, REVOKED, EXPIRED)
- **Permission**: Requires GRANT_COMPUTER_ACCESS permission

**REQ-COMP-002**: System MUST validate computer access requests
- **Personnel Clearance**: Must meet minimum clearance for system
- **Status**: Personnel must be active (not deleted)
- **Expiry**: Cannot grant access with past expiration date

#### 2.4.2 Data Access
**REQ-DATA-001**: System MUST support data access records
- **Fields**:
  - `personnelId` (UUID, foreign key)
  - `dataClassification` (enum: UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET)
  - `dataCategories` (array of strings)
  - `accessLevel` (enum: READ, WRITE, DELETE)
  - `grantedBy` (UUID, user ID)
  - `grantedAt` (timestamp)
  - `expiresAt` (timestamp, optional)
  - `status` (enum: ACTIVE, REVOKED, EXPIRED)
- **Permission**: Requires GRANT_DATA_ACCESS permission

**REQ-DATA-002**: System MUST validate data access requests
- **Clearance Match**: Personnel clearance >= data classification
- **Access Level**: Higher clearance doesn't auto-grant WRITE/DELETE
- **Categories**: Validate data categories exist

#### 2.4.3 Physical Access
**REQ-PHYS-001**: System MUST support physical access records
- **Fields**:
  - `personnelId` (UUID, foreign key)
  - `zoneName` (string, 1-100 chars)
  - `accessLevel` (enum: VISITOR, STANDARD, RESTRICTED, FULL)
  - `validFrom` (timestamp)
  - `validUntil` (timestamp)
  - `grantedBy` (UUID, user ID)
  - `status` (enum: ACTIVE, REVOKED, EXPIRED)
- **Permission**: Requires GRANT_PHYSICAL_ACCESS permission

**REQ-PHYS-002**: System MUST support access card management
- **Fields**:
  - `cardNumber` (string, unique, 8-20 chars)
  - `personnelId` (UUID, foreign key)
  - `issuedAt` (timestamp)
  - `expiresAt` (timestamp)
  - `status` (enum: ACTIVE, SUSPENDED, LOST, EXPIRED)
- **PIN**: Optional 4-6 digit PIN (hashed)
- **Permission**: Requires ISSUE_ACCESS_CARD permission

### 2.5 Audit & Compliance

#### 2.5.1 Audit Logging
**REQ-AUDIT-001**: System MUST log all data modifications
- **Operations**: CREATE, UPDATE, DELETE on all entities
- **Data Captured**:
  - `action` (string, operation name)
  - `entityType` (string, e.g., "personnel", "vendor")
  - `entityId` (UUID)
  - `userId` (UUID, who performed action)
  - `timestamp` (timestamp, ISO 8601)
  - `changes` (JSON, old and new values)
  - `ipAddress` (string)
  - `userAgent` (string)
- **Retention**: 7 years minimum

**REQ-AUDIT-002**: System MUST support audit log queries
- **Filters**: By entity type, entity ID, user ID, date range, action
- **Export**: Support CSV and JSON export
- **Permission**: Requires AUDIT_READ permission

#### 2.5.2 Compliance Reporting
**REQ-COMP-001**: System MUST generate compliance reports
- **Reports**:
  - Active personnel by clearance level
  - Expiring clearances (next 30 days)
  - Access grants by user
  - Security incidents (failed logins, permission denials)
- **Format**: PDF and CSV
- **Schedule**: On-demand and scheduled (weekly/monthly)
- **Permission**: Requires GENERATE_REPORTS permission

### 2.6 API Requirements

#### 2.6.1 RESTful API
**REQ-API-001**: All endpoints MUST follow REST conventions
- **GET**: Read operations (idempotent)
- **POST**: Create operations
- **PUT**: Update operations (full replacement)
- **PATCH**: Update operations (partial update)
- **DELETE**: Delete operations

**REQ-API-002**: All responses MUST follow standard format
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-10-26T12:00:00Z"
}
```

**REQ-API-003**: All errors MUST follow standard format
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  },
  "timestamp": "2025-10-26T12:00:00Z"
}
```

#### 2.6.2 Pagination
**REQ-PAGE-001**: List endpoints MUST support pagination
- **Parameters**:
  - `page` (integer, default 1, min 1)
  - `limit` (integer, default 50, min 1, max 100)
- **Response**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

#### 2.6.3 Filtering and Sorting
**REQ-FILTER-001**: List endpoints MUST support filtering
- **Format**: Query parameters (e.g., `?clearanceLevel=SECRET&department=Engineering`)
- **Operators**: Equals only (no complex operators in MVP)

**REQ-SORT-001**: List endpoints MUST support sorting
- **Parameter**: `sort` (e.g., `?sort=lastName` or `?sort=-createdAt` for descending)
- **Default**: Sorted by `createdAt` descending

---

## 3. **Non-Functional Requirements**

### 3.1 Performance

**REQ-PERF-001**: API response time MUST be < 50ms (p95)
- **Measurement**: 95th percentile of all requests under normal load
- **Load**: 100 concurrent users, 1000 requests/minute
- **Exclusions**: External API calls, file uploads

**REQ-PERF-002**: Backend build time MUST be < 30 seconds
- **Measurement**: `cargo build --release` on Apple M2
- **Clean Build**: From scratch with no cache
- **Incremental**: < 5 seconds for single file change

**REQ-PERF-003**: Frontend build time MUST be < 10 seconds
- **Measurement**: `npm run build` on Apple M2
- **Clean Build**: From scratch with no cache
- **Dev Mode**: < 2 seconds for HMR updates

**REQ-PERF-004**: Database queries MUST be optimized
- **Indexes**: All foreign keys indexed
- **N+1 Queries**: Eliminated through eager loading
- **Query Plans**: Reviewed for table scans

### 3.2 Security

**REQ-SEC-001**: All passwords MUST be hashed with bcrypt
- **Cost Factor**: 12 (2^12 iterations)
- **Salt**: Unique per password
- **Storage**: Never store plaintext passwords

**REQ-SEC-002**: All API endpoints MUST be authenticated
- **Exception**: `/api/auth/login` and `/api/health`
- **Mechanism**: JWT in Authorization header
- **Validation**: Signature verification + expiry check

**REQ-SEC-003**: All inputs MUST be validated and sanitized
- **Validation**: Type, length, format, range
- **Sanitization**: SQL injection, XSS prevention
- **Errors**: Return 400 Bad Request with field details

**REQ-SEC-004**: System MUST prevent common vulnerabilities
- **OWASP Top 10**: All mitigated
- **SQL Injection**: Parameterized queries only
- **XSS**: Output encoding + CSP headers
- **CSRF**: Token-based protection
- **Rate Limiting**: Per endpoint and per IP

### 3.3 Reliability

**REQ-REL-001**: System MUST maintain 99.9% uptime
- **Downtime**: < 43 minutes per month
- **Measurement**: Health check endpoint every 60 seconds
- **Exclusions**: Scheduled maintenance (announced 48 hours prior)

**REQ-REL-002**: System MUST handle database failures gracefully
- **Connection Pool**: Auto-reconnect on connection loss
- **Timeouts**: 5 second query timeout
- **Errors**: Return 503 Service Unavailable during outages

**REQ-REL-003**: System MUST support backup and recovery
- **Backup Frequency**: Daily automated backups
- **Retention**: 30 days
- **Recovery**: RTO < 1 hour, RPO < 24 hours

### 3.4 Maintainability

**REQ-MAINT-001**: Code MUST be simple and readable
- **Complexity**: Max cyclomatic complexity of 10 per function
- **Documentation**: Public functions documented
- **Naming**: Clear, descriptive names (no abbreviations)

**REQ-MAINT-002**: System MUST have comprehensive tests
- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user journeys covered
- **CI/CD**: All tests run on every commit

**REQ-MAINT-003**: Dependencies MUST be minimal and up-to-date
- **Backend**: < 20 direct dependencies
- **Frontend**: < 30 direct dependencies
- **Security**: No dependencies with known vulnerabilities
- **Updates**: Review and update quarterly

### 3.5 Usability

**REQ-USE-001**: Frontend MUST be responsive
- **Breakpoints**: Mobile (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- **Testing**: All features usable on each breakpoint

**REQ-USE-002**: Frontend MUST be accessible
- **Standard**: WCAG 2.1 Level AA compliance
- **Keyboard**: Full keyboard navigation support
- **Screen Readers**: Semantic HTML + ARIA labels
- **Contrast**: Minimum 4.5:1 text contrast

**REQ-USE-003**: System MUST provide helpful errors
- **User-Facing**: Clear, actionable error messages
- **Fields**: Specific field errors for validation
- **Logs**: Detailed error logs for debugging

### 3.6 Scalability

**REQ-SCALE-001**: System MUST support 1000+ concurrent users
- **Load Test**: Verify with load testing tool
- **Degradation**: Graceful degradation under load
- **Monitoring**: Metrics for requests/sec, error rate, latency

**REQ-SCALE-002**: Database MUST support 100,000+ personnel records
- **Performance**: Query performance does not degrade
- **Indexes**: Properly indexed for large datasets
- **Archival**: Strategy for archiving old records

---

## 4. **Technical Requirements**

### 4.1 Backend Technology Stack

**REQ-TECH-BE-001**: Backend MUST be implemented in Rust
- **Version**: Rust 1.70+ stable
- **Framework**: Rocket 0.5+ OR Actix-web 4+
- **Async Runtime**: Tokio 1+

**REQ-TECH-BE-002**: Backend MUST use PostgreSQL
- **Version**: PostgreSQL 15+
- **ORM**: SQLx (compile-time checked queries)
- **Migrations**: sqlx-cli for migrations

**REQ-TECH-BE-003**: Backend MUST use industry-standard libraries
- **JWT**: jsonwebtoken crate
- **Password**: bcrypt crate
- **Validation**: validator crate
- **Serialization**: serde + serde_json

### 4.2 Frontend Technology Stack

**REQ-TECH-FE-001**: Frontend MUST use React + TypeScript
- **React**: 18+
- **TypeScript**: 5+
- **Build Tool**: Vite 5+

**REQ-TECH-FE-002**: Frontend MUST use TanStack Router
- **Version**: @tanstack/router 1+
- **Routing**: File-based routing
- **Type Safety**: Fully typed routes

**REQ-TECH-FE-003**: Frontend MUST use shadcn/ui + Tailwind CSS
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS 3+
- **Icons**: Lucide React

**REQ-TECH-FE-004**: Frontend MUST use TanStack Query
- **Version**: @tanstack/react-query 5+
- **State**: Server state management
- **Caching**: Intelligent caching and invalidation

### 4.3 Development Environment

**REQ-DEV-001**: Development setup MUST be simple
- **Backend**: `cargo run`
- **Frontend**: `npm run dev`
- **Database**: `docker-compose up postgres`
- **Time**: < 5 minutes from clone to running

**REQ-DEV-002**: System MUST work on Mac M2
- **Architecture**: Native ARM64 support
- **Docker**: M2-compatible images
- **Dependencies**: All dependencies M2-compatible

### 4.4 Deployment

**REQ-DEPLOY-001**: Deployment MUST be containerized
- **Backend**: Docker image < 100MB
- **Frontend**: Docker image < 50MB
- **Database**: Official PostgreSQL image

**REQ-DEPLOY-002**: Deployment MUST use docker-compose
- **Single Command**: `docker-compose up -d`
- **Configuration**: Environment variables only
- **Health Checks**: Built-in health check endpoints

---

## 5. **Data Requirements**

### 5.1 Database Schema

**REQ-DB-001**: Database MUST use UUIDs for primary keys
- **Type**: UUID v4
- **Library**: uuid crate
- **Format**: Standard 36-character format

**REQ-DB-002**: Database MUST support soft deletes
- **Field**: `deleted_at` (timestamp, nullable)
- **Behavior**: Soft deleted records excluded from normal queries
- **Recovery**: Support undelete operation

**REQ-DB-003**: Database MUST track timestamps
- **Fields**: `created_at`, `updated_at`
- **Type**: TIMESTAMP WITH TIME ZONE
- **Automatic**: Auto-updated on INSERT/UPDATE

### 5.2 Data Validation

**REQ-VALID-001**: All string fields MUST have length limits
- **Names**: 1-100 characters
- **Emails**: Valid RFC 5322 format
- **Phones**: E.164 format (+1234567890)
- **IDs**: UUID format

**REQ-VALID-002**: All enum fields MUST use database enums
- **Type**: PostgreSQL ENUM types
- **Validation**: At database level
- **Migration**: Enum changes via migrations

### 5.3 Data Privacy

**REQ-PRIV-001**: System MUST support data minimization
- **Collection**: Only collect necessary data
- **Retention**: Delete data when no longer needed
- **Access**: Limit access to authorized users only

**REQ-PRIV-002**: System MUST support data export
- **Format**: JSON and CSV
- **Scope**: Per personnel record
- **Permission**: EXPORT_DATA permission required

---

## 6. **Testing Requirements**

### 6.1 Unit Testing

**REQ-TEST-001**: Backend MUST have unit tests
- **Coverage**: 80% minimum
- **Framework**: Built-in Rust test framework
- **Execution**: `cargo test`

**REQ-TEST-002**: Frontend MUST have component tests
- **Coverage**: 70% minimum
- **Framework**: Vitest + Testing Library
- **Execution**: `npm test`

### 6.2 Integration Testing

**REQ-INTEG-001**: All API endpoints MUST have integration tests
- **Coverage**: 100% of API endpoints
- **Framework**: Rust integration tests
- **Data**: Test database with fixtures

### 6.3 End-to-End Testing

**REQ-E2E-001**: Critical user journeys MUST have E2E tests
- **Journeys**:
  - Login → View Personnel → Logout
  - Create Personnel → Assign Clearance → Grant Access
  - Create Vendor → Assign Personnel → View Hierarchy
- **Framework**: Playwright
- **Execution**: `npm run test:e2e`

### 6.4 Performance Testing

**REQ-PERF-TEST-001**: System MUST be load tested
- **Tool**: Apache Bench or k6
- **Scenarios**: 100 concurrent users, 1000 req/min
- **Metrics**: Response time, error rate, throughput

---

## 7. **Documentation Requirements**

### 7.1 Code Documentation

**REQ-DOC-CODE-001**: Public functions MUST be documented
- **Format**: Rust doc comments (///)
- **Content**: Purpose, parameters, return value, examples
- **Generate**: `cargo doc --open`

### 7.2 API Documentation

**REQ-DOC-API-001**: API MUST be documented
- **Format**: OpenAPI 3.0 specification
- **Tool**: Swagger UI for interactive docs
- **Endpoint**: `/api/docs`

### 7.3 User Documentation

**REQ-DOC-USER-001**: System MUST have user guide
- **Content**: How to use each feature
- **Format**: Markdown + screenshots
- **Location**: `/docs/user-guide.md`

### 7.4 Developer Documentation

**REQ-DOC-DEV-001**: System MUST have developer guide
- **Content**: Setup, architecture, development workflow
- **Format**: Markdown
- **Location**: `/docs/developer-guide.md`

---

## 8. **Acceptance Criteria**

### 8.1 MVP 1 Acceptance Criteria

✅ **MVP 1 is complete when**:
1. User can login with username/password
2. User can view list of personnel (paginated)
3. User can create new personnel record
4. User can view personnel details
5. User can update personnel record
6. User can delete personnel record (soft delete)
7. User can view list of vendors (paginated)
8. User can create new vendor record
9. All API endpoints respond in < 50ms (p95)
10. All unit tests pass (80% coverage)
11. All integration tests pass (100% endpoint coverage)
12. System deploys with `docker-compose up`

### 8.2 MVP 2 Acceptance Criteria

✅ **MVP 2 is complete when**:
1. All MVP 1 criteria met
2. User can grant computer access to personnel
3. User can grant data access to personnel
4. User can grant physical access to personnel
5. User can view all access grants for a person
6. User can revoke access grants
7. System validates clearance levels before granting access
8. System auto-revokes expired access
9. All three-tier access endpoints tested
10. E2E tests cover access grant workflows

---

## 9. **Out of Scope (Not in MVP)**

These features are **explicitly excluded** from initial release:

❌ **Not in MVP 1-2**:
- BPMN workflow modeling
- Contract management
- AI integration (Ollama, semantic search)
- Advanced analytics dashboards
- Confusion matrices
- Quality metrics calculations
- Effectiveness metrics
- HITL (Human-in-the-Loop) workflows
- Mobile application
- Excel export
- PDF generation
- Email notifications
- Real-time WebSocket updates
- Advanced reporting
- Data visualization charts
- Multi-tenancy
- SSO/SAML integration
- Advanced search (ElasticSearch)

---

## 10. **Requirements Traceability**

### 10.1 Priority Classification
- **P0** (Must Have): All authentication, personnel CRUD, basic RBAC
- **P1** (Should Have): Three-tier access, audit logging, vendors
- **P2** (Nice to Have): Advanced reporting, analytics
- **P3** (Future): AI, advanced workflows, integrations

### 10.2 Testing Coverage
- Each requirement with ID (REQ-XXX-###) MUST have corresponding test
- Test ID format: TEST-XXX-### (matches requirement)
- Traceability matrix: Requirements → Tests → Code

---

## Summary

This document defines **complete, testable requirements** for Janus 2.0. Key principles:

1. **Precise**: Every requirement is measurable
2. **Testable**: Clear acceptance criteria
3. **Simple**: No over-engineering
4. **Complete**: All necessary features defined
5. **Focused**: MVP scope clearly defined

Next: Read `02-ARCHITECTURE.md` to see how these requirements are implemented.

