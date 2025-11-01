# Refactoring: Personnel/Users → Person

**Status**: 🚧 In Progress (Incremental - Option 3)  
**Date**: 2025-01-30  
**Scope**: Major refactoring affecting database, backend, frontend, and documentation

---

## 🎯 Goal

Unify `users` and `personnel` tables into a single `person` entity that can represent:
- **Users**: Persons with username/password/role (system users)
- **Named Persons**: Persons with first_name/last_name (Bill Gates, Albert Einstein)
- **Unnamed Persons**: Persons with only relations (no name, just exists in relationships)

---

## ✅ Completed (Module 1: Core Person Module)

1. **Database Migrations** (3 files):
   - ✅ `20250131000000_create_person_table_unified.sql` - Creates person table, migrates data, updates foreign keys
   - ✅ `20250131000001_drop_old_tables_after_migration.sql` - Drops old tables after verification
   - ✅ `20250131000002_update_relations_entity_type.sql` - Updates relations table entity_type

2. **Backend Person Module**:
   - ✅ Created `backend/src/person/models.rs` with unified Person model
   - ✅ Created `backend/src/person/handlers.rs` with CRUD handlers
   - ✅ Created `backend/src/person/mod.rs` with module exports
   - ✅ Updated `backend/src/main.rs` to use `person` instead of `personnel`
   - ✅ Updated `backend/src/lib.rs` to export `person` module
   - ✅ Updated `backend/src/shared/rocket_setup.rs` to use person handlers
   - ✅ **Compiles successfully** ✓

**API Endpoints**:
- `GET /api/persons` - List persons (with pagination)
- `GET /api/persons/:id` - Get person by ID
- `POST /api/persons` - Create person (supports users, named persons, or unnamed)
- `PUT /api/persons/:id` - Update person
- `DELETE /api/persons/:id` - Soft delete person

---

## 🔄 Next Modules (Incremental Approach)

### Module 2: Auth Module ⏳ Next
- [ ] Update `auth/models.rs` to use Person instead of User
- [ ] Update `auth/handlers.rs` login to query person table
- [ ] Update `auth/handlers.rs` get_profile to return Person
- [ ] Test authentication after changes

### Module 3: Access Module ⏳
- [ ] Update `access/handlers.rs` to use `person_id` instead of `personnel_id`
- [ ] Update queries to reference `person` table
- [ ] Update `list_personnel_access` → `list_person_access`
- [ ] Test access endpoints

### Module 4: NDA Module ✅
- [x] Update `nda/models.rs` to use `person_id` and `issued_by_person_id`
- [x] Update `nda/handlers.rs` to use `person_id` in all queries
- [x] Update queries to reference `person` table instead of `personnel`
- [x] Update endpoint parameter from `personnel_id` to `person_id`
- [x] **Compiles successfully** ✓

### Module 5: Discussions Module ✅
- [x] Update `discussions/models.rs` to use `person_id` and `*_person_id`
- [x] Update `discussions/handlers.rs` to use `person_id` in all queries
- [x] Update endpoint parameter from `personnel_id` to `person_id`
- [x] **Compiles successfully** ✓

### Module 6: Document References Module ✅
- [x] Update `document_references/models.rs` to use `person_id` and `*_person_id`
- [x] Update `document_references/handlers.rs` queries
- [x] Simplified email matching logic (auth.claims.sub already has person_id)
- [x] **Compiles successfully** ✓

### Module 7: Vendor Relations Module ✅
- [x] Update `vendor_relations/models.rs` to use `related_person_id`
- [x] Update `vendor_relations/handlers.rs` queries
- [x] **Compiles successfully** ✓

### Module 8: Audit Module ✅
- [x] Update `audit/models.rs` to use `person_id` instead of `user_id`
- [x] Update `audit/handlers.rs` queries to use `person_id`
- [x] Update `create_audit_log` function
- [x] **Compiles successfully** ✓

### Module 9: Relations Module ✅
- [x] Update `relations/models.rs` EntityType enum from Personnel to Person
- [x] Update `relations/handlers.rs` entity_type strings from 'personnel' to 'person'
- [x] Update queries to use `person` table instead of `personnel`
- [x] Update endpoint from `/personnel/<id>/relations` to `/persons/<id>/relations`
- [x] Update function name from `list_personnel_relations` to `list_person_relations`
- [x] **Compiles successfully** ✓

### Module 10: Frontend ⏳ In Progress
- [x] Update TypeScript types (person.ts created, all types updated)
  - [x] `personnel.ts` → `person.ts` (created unified Person model)
  - [x] `access.ts` (personnel_id → person_id, PersonnelAccess → PersonAccess)
  - [x] `document-reference.ts` (personnel_id → person_id, self_reported_by → self_reported_by_person_id)
  - [x] `discussion.ts` (personnel_id → person_id, created_by → created_by_person_id)
  - [x] `nda.ts` (personnel_id → person_id, issued_by → issued_by_person_id)
  - [x] `relation.ts` (personnel → person, vendor → organization)
- [x] Update hooks (all hooks updated with new types and endpoints)
  - [x] `use-access.ts` (usePersonnelAccess → usePersonAccess, endpoint updated)
  - [x] `use-personnel.ts` → `use-person.ts` (created)
  - [x] `use-document-references.ts` (personnel_id → person_id in filters)
  - [x] `use-discussions.ts` (personnel_id → person_id in filters)
  - [x] `use-nda.ts` (personnel_id → person_id in filters)
  - [x] `use-relations.ts` (personnel → person, vendor → organization)
- [ ] Update routes/components (partially done)
  - [ ] `routes/personnel/*` → `routes/persons/*` (rename routes)
  - [ ] Update components to use `usePerson*` hooks instead of `usePersonnel*`
  - [ ] Update field references (personnelId → personId, etc.)
  - [ ] Update dashboard references

---

## 🔧 Migration Notes

**Database**:
- `personnel` table → `person` table (merged with `users`)
- `users` table → `person` table (merged into `person`)
- All foreign keys updated: `personnel_id` → `person_id`, `user_id` → `person_id` or `*_person_id`

**Backend**:
- All SQL queries updated to use `person` table
- Runtime-checked queries used (person table doesn't exist yet at compile time)
- API endpoints: `/api/personnel/*` → `/api/persons/*`

**Frontend** (Not started):
- Routes: `/personnel/*` → `/persons/*`
- Types: `Personnel` → `Person`
- Hooks: `use-personnel.ts` → `use-persons.ts`

---

## ⚠️ Breaking Changes

- **API**: `/api/personnel/*` → `/api/persons/*`
- **Database**: `personnel` and `users` tables removed (after migration)
- **Foreign Keys**: `personnel_id` → `person_id`, `user_id` → `person_id` (or `*_person_id`)

---

## 📝 Testing Status

**Module 1 (Person Core)**: ✅ Compiles  
**Remaining Modules**: ⏳ Not yet updated

**Note**: Cannot fully test until migrations are run and other modules are updated.

---

*Incremental approach: Complete one module at a time, test, then proceed to next.*
