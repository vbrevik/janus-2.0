-- Rename personnel table to person
ALTER TABLE personnel RENAME TO person;

-- Rename indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_personnel_email') THEN
        ALTER INDEX idx_personnel_email RENAME TO idx_person_email;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_personnel_deleted_at') THEN
        ALTER INDEX idx_personnel_deleted_at RENAME TO idx_person_deleted_at;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_personnel_clearance') THEN
        ALTER INDEX idx_personnel_clearance RENAME TO idx_person_clearance;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_personnel_vendor') THEN
        ALTER INDEX idx_personnel_vendor RENAME TO idx_person_organization;
    END IF;
END $$;

-- Rename trigger
DROP TRIGGER IF EXISTS update_personnel_updated_at ON person;
CREATE TRIGGER update_person_updated_at BEFORE UPDATE ON person
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update foreign key references in other tables
-- Note: Check if these tables exist before altering
DO $$
BEGIN
    -- Update vendor_relations if it has personnel_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_relations' AND column_name = 'related_personnel_id') THEN
        ALTER TABLE vendor_relations RENAME COLUMN related_personnel_id TO related_person_id;
    END IF;
    
    -- Update relations table if it references personnel
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'relations' AND column_name LIKE '%personnel%') THEN
        -- Relations table uses entity_type, so no column rename needed, but update entity_type values
        UPDATE relations SET entity_type = 'person' WHERE entity_type = 'personnel';
    END IF;
    
    -- Update audit_log resource_type
    UPDATE audit_log SET resource_type = 'PERSON' WHERE resource_type = 'PERSONNEL';
    
    -- Update permissions
    UPDATE permissions SET key = 'person.read' WHERE key = 'personnel.read';
    UPDATE permissions SET key = 'person.write' WHERE key = 'personnel.write';
END $$;

