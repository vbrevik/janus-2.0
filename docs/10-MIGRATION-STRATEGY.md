# Janus 2.0 - Migration Strategy from Janus 1.0

## Document Purpose

This document outlines the migration strategy from Janus 1.0 to Janus 2.0.

---

## Migration Overview

**Janus 2.0 is a complete rewrite**, not an upgrade of Janus 1.0. This means:

- ✅ **Clean slate** - No legacy code to maintain
- ✅ **New architecture** - Rust backend, simplified design
- ✅ **Data migration** - Export from 1.0, import to 2.0
- ❌ **No code migration** - Different technology stack

---

## Migration Approach

### Phase 1: Data Export (Janus 1.0)

**Export all data from Janus 1.0**:
- Personnel records
- Vendor records
- Access grants
- Audit logs
- User accounts

**Format**: CSV or JSON export scripts

### Phase 2: Schema Mapping

**Map Janus 1.0 schema to Janus 2.0**:

| Janus 1.0 | Janus 2.0 | Notes |
|-----------|-----------|-------|
| `users` | `users` | Same structure |
| `personnel` | `personnel` | Similar, some field changes |
| `vendors` | `vendors` | Similar structure |
| `computer_access` | `computer_access` | Compatible |
| `data_access` | `data_access` | Compatible |
| `physical_access` | `physical_access` | Compatible |

### Phase 3: Data Import (Janus 2.0)

**Import scripts**:
- Validate data format
- Transform data to match Janus 2.0 schema
- Import via API or direct database

### Phase 4: Verification

- Verify all records imported
- Spot-check data accuracy
- Verify relationships maintained

---

## Data Migration Scripts

### Personnel Migration

```bash
# Export from Janus 1.0
node export-personnel.js > personnel.json

# Import to Janus 2.0
python import-personnel.py personnel.json
```

### Access Grants Migration

```bash
# Export access grants
node export-access.js > access.json

# Import with proper mapping
python import-access.py access.json
```

---

## Migration Considerations

### Field Changes

**Clearance Levels**: May need mapping if enum values changed  
**Timestamps**: Ensure timezone handling  
**Soft Deletes**: Migrate `deleted` flags to `deleted_at` timestamps

### Relationships

**Foreign Keys**: Verify all relationships maintained  
**Cascade Deletes**: Check behavior matches expectations

### Data Validation

**Email Format**: Ensure all emails valid  
**Phone Numbers**: Standardize to E.164 format  
**Required Fields**: Ensure all required fields populated

---

## Rollback Plan

If migration fails:

1. **Keep Janus 1.0 running** during migration
2. **Run in parallel** - Both systems operational
3. **Gradual cutover** - Migrate feature by feature
4. **Verify before switching** - Test thoroughly

---

## Timeline

**Recommended Approach**: Big Bang migration (one-time cutover)

1. **Preparation** (1 week):
   - Export all data
   - Create import scripts
   - Test on staging

2. **Migration** (1 day):
   - Deploy Janus 2.0
   - Import all data
   - Verify accuracy

3. **Cutover** (1 day):
   - Switch DNS/routing to Janus 2.0
   - Monitor for issues
   - Keep Janus 1.0 as backup

4. **Verification** (1 week):
   - Monitor system
   - Fix any issues
   - Decommission Janus 1.0

---

## Post-Migration

### User Training

- New UI differences
- New workflows
- Updated procedures

### Documentation

- Update user guides
- Update admin guides
- Update procedures

---

## Notes

**⚠️ Important**: Janus 2.0 is designed as a replacement, not an upgrade. The architecture is fundamentally different (Rust vs Node.js, simplified design), so direct code migration is not possible.

**✅ Benefit**: Clean implementation with lessons learned from Janus 1.0 applied.

---

**Last Updated**: 2025-01-30  
**Status**: Planning phase (not yet executed)

