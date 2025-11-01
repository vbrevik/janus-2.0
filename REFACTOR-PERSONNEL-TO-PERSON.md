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

### Module 4: NDA Module ⏳
- [ ] Update `nda/handlers.rs` to use `person_id`
- [ ] Update queries to reference `person` table

### Module 5: Discussions Module ⏳
- [ ] Update `discussions/handlers.rs` to use `person_id` and `*_person_id`
- [ ] Update queries

### Module 6: Document References Module ⏳
- [ ] Update `document_references/handlers.rs`
- [ ] Update email matching logic

### Module 7: Vendor Relations Module ⏳
- [ ] Update `vendor_relations/handlers.rs` to use `related_person_id`

### Module 8: Audit Module ⏳
- [ ] Update `audit/handlers.rs` to use `person_id`

### Module 9: Relations Module ⏳
- [ ] Update `relations/handlers.rs` entity_type from 'personnel' to 'person'

### Module 10: Frontend ⏳
- [ ] Update TypeScript types
- [ ] Update routes
- [ ] Update components
- [ ] Update hooks

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
