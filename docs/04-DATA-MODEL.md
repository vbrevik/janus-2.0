# Janus 2.0 - Database Schema & Data Model

## Document Purpose

This document provides a consolidated view of the database schema. **For the actual source of truth, see migration files in `backend/migrations/`**.

---

## Schema Overview

All tables follow these conventions:
- **Primary Keys**: `id` (SERIAL/INTEGER, auto-increment)
- **Timestamps**: `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Soft Deletes**: `deleted_at` (TIMESTAMP, nullable) where applicable
- **Foreign Keys**: Proper referential integrity

---

## Core Tables

### Users
**Purpose**: System authentication and authorization  
**Migration**: `20251026112327_create_users_table.sql`

**Fields**:
- `id` (SERIAL PRIMARY KEY)
- `username` (VARCHAR(50) UNIQUE)
- `password_hash` (VARCHAR(255))
- `role` (VARCHAR(20)) - admin, manager, operator, viewer
- `created_at`, `updated_at` (TIMESTAMP)

### Personnel
**Purpose**: Personnel records with clearance levels  
**Migration**: `20251026112329_create_personnel_table.sql`

**Fields**:
- `id` (SERIAL PRIMARY KEY)
- `first_name`, `last_name` (VARCHAR(100))
- `email` (VARCHAR(255) UNIQUE)
- `phone` (VARCHAR(20))
- `clearance_level` (ENUM: NONE, CONFIDENTIAL, SECRET, TOP_SECRET)
- `department`, `position` (VARCHAR(255))
- `deleted_at` (TIMESTAMP, nullable) - soft delete
- `created_at`, `updated_at` (TIMESTAMP)

### Organizations
**Purpose**: Organization/contractor management  
**Migration**: `20251026112330_create_organizations_table.sql`

**Fields**:
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255) UNIQUE)
- `type` (ENUM: CONTRACTOR, SUPPLIER, PARTNER, INTERNAL)
- `clearance_level` (ENUM)
- `department` (VARCHAR(100)) - added in `20251101175000`
- `contact_email`, `contact_phone` (VARCHAR)
- `address` (TEXT)
- `deleted_at`, `created_at`, `updated_at` (TIMESTAMP)

---

## Access Control Tables

### Computer Access
**Migration**: `20251026132437_create_computer_access_table.sql`

**Purpose**: System-level computer access grants  
**Fields**: `id`, `personnel_id`, `system_name`, `access_level` (READ/WRITE/ADMIN), `granted_by`, `granted_at`, `expires_at`, `status`, `created_at`, `updated_at`

### Data Access
**Migration**: `20251026132437_create_data_access_table.sql`

**Purpose**: Data classification-based access  
**Fields**: `id`, `personnel_id`, `data_classification` (UNCLASSIFIED/CONFIDENTIAL/SECRET/TOP_SECRET), `data_categories`, `access_level`, `granted_by`, `granted_at`, `expires_at`, `status`

### Physical Access
**Migration**: `20251026132437_create_physical_access_table.sql`

**Purpose**: Physical zone access control  
**Fields**: `id`, `personnel_id`, `zone_name`, `access_level` (VISITOR/STANDARD/RESTRICTED/FULL), `valid_from`, `valid_until`, `granted_by`, `status`

---

## Supporting Tables

### Audit Logs
**Migration**: `20251026114844_create_audit_log_table.sql`

**Purpose**: Complete audit trail of all changes  
**Fields**: `id`, `user_id`, `action`, `resource_type`, `resource_id`, `changes` (JSONB), `ip_address`, `user_agent`, `timestamp`

### Organization Relations
**Migration**: `20251026195324_create_organization_relations_table.sql`

**Purpose**: Organization hierarchy (parent-child relationships)  
**Fields**: `id`, `parent_organization_id`, `child_organization_id`, `relationship_type`, `start_date`, `end_date`, `created_at`, `updated_at`

### Information Systems
**Migration**: `20251026140000_create_info_systems_table.sql`

**Purpose**: IT infrastructure system tracking  
**Fields**: `id`, `system_name` (UNIQUE), `description`, `environment` (DEV/TEST/PROD), `status` (ACTIVE/INACTIVE/MAINTENANCE), `ip_address`, `domain`, `managed_by`, `last_audit_date`

### Roles & Permissions
**Migration**: `20251030160000_create_roles_permissions.sql`

**Purpose**: RBAC system  
**Tables**:
- `roles` - Role definitions
- `permissions` - Available permissions
- `role_permissions` - Role-permission mappings

### NDAs
**Migration**: `20250128000000_create_nda_table.sql` + updates

**Purpose**: Non-disclosure agreement management  
**Fields**: `id`, `personnel_id`, `title`, `content`, `status` (PENDING/SIGNED/REJECTED/EXPIRED), `issued_at`, `signed_at`, `expires_at`, `signature`, `rejection_reason`, `sent_by_organization_id`, `sent_at`

### Discussions
**Migration**: `20250129000000_create_discussions_table.sql`

**Purpose**: End-user to admin communication  
**Tables**:
- `discussions` - Discussion threads
- `discussion_replies` - Replies to discussions

### Document References
**Migration**: `20250129000001_create_document_references_table.sql`

**Purpose**: Physical document tracking  
**Fields**: `id`, `personnel_id`, `title`, `document_type`, `description`, `issued_date`, `location`, `self_reported_by`, `verified_by`, `status`, `notes`, `attachment_s3_key`, `attachment_s3_bucket`

---

## Relationships

**Key Foreign Keys**:
- All access tables → `personnel.id`
- All access tables → `users.id` (granted_by)
- `organization_relations` → `organizations.id` (parent/child)
- `nda`, `discussions`, `document_references` → `personnel.id`
- `role_permissions` → `roles.id` and `permissions.id`

---

## Indexes

All foreign keys are indexed. Common indexes:
- Email fields (UNIQUE)
- Name fields (for search)
- Status fields (for filtering)
- Timestamps (for sorting)

---

## Source of Truth

**⚠️ Important**: The actual database schema is defined in migration files. This document is a summary.

**To see exact schema**:
```bash
cd backend/migrations
ls -la *.sql
cat <migration-file>.sql
```

**To apply migrations**:
```bash
cd backend
sqlx migrate run
```

---

**Last Updated**: 2025-01-30  
**Migration Count**: 20+ migrations  
**Table Count**: 15+ tables

