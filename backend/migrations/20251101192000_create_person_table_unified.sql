-- Migration: Rename users and personnel to unified person table
-- This migration creates a new 'person' table that merges both 'users' and 'personnel'
-- A person can be: a user (has username/password), a named person (has first_name/last_name), 
-- an unnamed person (just relations), or any combination

-- Step 1: Create new unified person table
CREATE TABLE IF NOT EXISTS person (
    id SERIAL PRIMARY KEY,
    
    -- Identity fields (optional - person may not have a name)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    
    -- User-specific fields (optional - only if person is a user)
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    
    -- Personnel-specific fields (optional - only if person has clearance info)
    clearance_level VARCHAR(50) CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET')),
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- Common fields
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_user_requires_auth CHECK (
        (username IS NULL AND password_hash IS NULL AND role IS NULL) OR
        (username IS NOT NULL AND password_hash IS NOT NULL AND role IS NOT NULL)
    ),
    CONSTRAINT chk_has_some_identity CHECK (
        first_name IS NOT NULL OR last_name IS NOT NULL OR email IS NOT NULL OR username IS NOT NULL
    )
);

-- Step 2: Migrate data from users table first
-- Users become persons with username/password/role
INSERT INTO person (id, username, password_hash, role, email, created_at, updated_at)
SELECT 
    id,
    username,
    password_hash,
    role,
    COALESCE(
        (SELECT email FROM personnel WHERE email = users.username || '@janus.local' LIMIT 1),
        username || '@janus.local'
    ) as email,
    created_at,
    updated_at
FROM users;

-- Step 2b: Advance the person id sequence past the explicitly-inserted user ids.
-- Step 2 inserts person rows with explicit ids copied from users, which does NOT
-- bump the SERIAL sequence. Without this, Step 3's sequence-allocated inserts would
-- collide with those ids and violate person_pkey. (Repaired during Phase 11-01.)
SELECT setval(
    pg_get_serial_sequence('person', 'id'),
    COALESCE((SELECT MAX(id) FROM person), 1),
    true
);

-- Step 3: Migrate personnel that don't have matching users (by email)
-- Try to match by email first, if no match, insert as new person
INSERT INTO person (first_name, last_name, email, phone, clearance_level, department, position, deleted_at, created_at, updated_at)
SELECT 
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.clearance_level,
    p.department,
    p.position,
    p.deleted_at,
    p.created_at,
    p.updated_at
FROM personnel p
WHERE NOT EXISTS (
    SELECT 1 FROM person per WHERE per.email = p.email
)
ON CONFLICT (email) DO NOTHING;

-- Step 4: Update person records that have matching personnel by email (merge user + personnel data)
UPDATE person p
SET
    first_name = COALESCE(p.first_name, per.first_name),
    last_name = COALESCE(p.last_name, per.last_name),
    phone = COALESCE(p.phone, per.phone),
    clearance_level = COALESCE(p.clearance_level, per.clearance_level),
    department = COALESCE(p.department, per.department),
    position = COALESCE(p.position, per.position),
    deleted_at = COALESCE(p.deleted_at, per.deleted_at),
    updated_at = GREATEST(p.updated_at, per.updated_at)
FROM personnel per
WHERE per.email = p.email;

-- Step 5: Update foreign key references - rename personnel_id to person_id
ALTER TABLE computer_access 
    RENAME COLUMN personnel_id TO person_id;

ALTER TABLE data_access 
    RENAME COLUMN personnel_id TO person_id;

ALTER TABLE physical_access 
    RENAME COLUMN personnel_id TO person_id;

ALTER TABLE nda 
    RENAME COLUMN personnel_id TO person_id;

ALTER TABLE discussions 
    RENAME COLUMN personnel_id TO person_id;

ALTER TABLE document_references 
    RENAME COLUMN personnel_id TO person_id;

ALTER TABLE vendor_relations 
    RENAME COLUMN related_personnel_id TO related_person_id;

-- Step 6: Update foreign key references - rename user_id to person_id for granted_by, created_by, etc.
-- Note: These fields reference person who granted/created, which should be users
ALTER TABLE computer_access 
    RENAME COLUMN granted_by TO granted_by_person_id;

ALTER TABLE data_access 
    RENAME COLUMN granted_by TO granted_by_person_id;

ALTER TABLE physical_access 
    RENAME COLUMN granted_by TO granted_by_person_id;

ALTER TABLE nda 
    RENAME COLUMN issued_by TO issued_by_person_id;

ALTER TABLE discussions 
    RENAME COLUMN created_by TO created_by_person_id;

ALTER TABLE discussions 
    RENAME COLUMN assigned_to TO assigned_to_person_id;

ALTER TABLE discussions 
    RENAME COLUMN resolved_by TO resolved_by_person_id;

ALTER TABLE discussion_replies 
    RENAME COLUMN created_by TO created_by_person_id;

ALTER TABLE document_references 
    RENAME COLUMN self_reported_by TO self_reported_by_person_id;

ALTER TABLE document_references 
    RENAME COLUMN verified_by TO verified_by_person_id;

ALTER TABLE audit_log 
    RENAME COLUMN user_id TO person_id;

-- Step 7: Update foreign key constraints to reference person table
ALTER TABLE computer_access
    DROP CONSTRAINT IF EXISTS computer_access_personnel_id_fkey,
    ADD CONSTRAINT computer_access_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE computer_access
    DROP CONSTRAINT IF EXISTS computer_access_granted_by_fkey,
    ADD CONSTRAINT computer_access_granted_by_person_id_fkey FOREIGN KEY (granted_by_person_id) REFERENCES person(id);

ALTER TABLE data_access
    DROP CONSTRAINT IF EXISTS data_access_personnel_id_fkey,
    ADD CONSTRAINT data_access_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE data_access
    DROP CONSTRAINT IF EXISTS data_access_granted_by_fkey,
    ADD CONSTRAINT data_access_granted_by_person_id_fkey FOREIGN KEY (granted_by_person_id) REFERENCES person(id);

ALTER TABLE physical_access
    DROP CONSTRAINT IF EXISTS physical_access_personnel_id_fkey,
    ADD CONSTRAINT physical_access_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE physical_access
    DROP CONSTRAINT IF EXISTS physical_access_granted_by_fkey,
    ADD CONSTRAINT physical_access_granted_by_person_id_fkey FOREIGN KEY (granted_by_person_id) REFERENCES person(id);

ALTER TABLE nda
    DROP CONSTRAINT IF EXISTS nda_personnel_id_fkey,
    ADD CONSTRAINT nda_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE nda
    DROP CONSTRAINT IF EXISTS nda_issued_by_fkey,
    ADD CONSTRAINT nda_issued_by_person_id_fkey FOREIGN KEY (issued_by_person_id) REFERENCES person(id);

ALTER TABLE discussions
    DROP CONSTRAINT IF EXISTS discussions_personnel_id_fkey,
    ADD CONSTRAINT discussions_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE discussions
    DROP CONSTRAINT IF EXISTS discussions_created_by_fkey,
    ADD CONSTRAINT discussions_created_by_person_id_fkey FOREIGN KEY (created_by_person_id) REFERENCES person(id);

ALTER TABLE discussions
    DROP CONSTRAINT IF EXISTS discussions_assigned_to_fkey,
    ADD CONSTRAINT discussions_assigned_to_person_id_fkey FOREIGN KEY (assigned_to_person_id) REFERENCES person(id);

ALTER TABLE discussions
    DROP CONSTRAINT IF EXISTS discussions_resolved_by_fkey,
    ADD CONSTRAINT discussions_resolved_by_person_id_fkey FOREIGN KEY (resolved_by_person_id) REFERENCES person(id);

ALTER TABLE discussion_replies
    DROP CONSTRAINT IF EXISTS discussion_replies_created_by_fkey,
    ADD CONSTRAINT discussion_replies_created_by_person_id_fkey FOREIGN KEY (created_by_person_id) REFERENCES person(id);

ALTER TABLE document_references
    DROP CONSTRAINT IF EXISTS document_references_personnel_id_fkey,
    ADD CONSTRAINT document_references_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE document_references
    DROP CONSTRAINT IF EXISTS document_references_self_reported_by_fkey,
    ADD CONSTRAINT document_references_self_reported_by_person_id_fkey FOREIGN KEY (self_reported_by_person_id) REFERENCES person(id);

ALTER TABLE document_references
    DROP CONSTRAINT IF EXISTS document_references_verified_by_fkey,
    ADD CONSTRAINT document_references_verified_by_person_id_fkey FOREIGN KEY (verified_by_person_id) REFERENCES person(id);

ALTER TABLE vendor_relations
    DROP CONSTRAINT IF EXISTS vendor_relations_related_personnel_id_fkey,
    ADD CONSTRAINT vendor_relations_related_person_id_fkey FOREIGN KEY (related_person_id) REFERENCES person(id) ON DELETE CASCADE;

ALTER TABLE audit_log
    DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey,
    ADD CONSTRAINT audit_log_person_id_fkey FOREIGN KEY (person_id) REFERENCES person(id);

-- Step 8: Update indexes
DROP INDEX IF EXISTS idx_computer_access_personnel;
CREATE INDEX IF NOT EXISTS idx_computer_access_person ON computer_access(person_id) WHERE status = 'ACTIVE';

DROP INDEX IF EXISTS idx_data_access_personnel;
CREATE INDEX IF NOT EXISTS idx_data_access_person ON data_access(person_id) WHERE status = 'ACTIVE';

DROP INDEX IF EXISTS idx_physical_access_personnel;
CREATE INDEX IF NOT EXISTS idx_physical_access_person ON physical_access(person_id) WHERE status = 'ACTIVE';

DROP INDEX IF EXISTS idx_nda_personnel;
CREATE INDEX IF NOT EXISTS idx_nda_person ON nda(person_id);

DROP INDEX IF EXISTS idx_discussions_personnel;
CREATE INDEX IF NOT EXISTS idx_discussions_person ON discussions(person_id);

DROP INDEX IF EXISTS idx_document_references_personnel;
CREATE INDEX IF NOT EXISTS idx_document_references_person ON document_references(person_id);

DROP INDEX IF EXISTS idx_vendor_relations_related_personnel_id;
CREATE INDEX IF NOT EXISTS idx_vendor_relations_related_person_id ON vendor_relations(related_person_id);

DROP INDEX IF EXISTS idx_audit_log_user_id;
CREATE INDEX IF NOT EXISTS idx_audit_log_person_id ON audit_log(person_id);

-- Step 9: Create indexes on person table
CREATE INDEX IF NOT EXISTS idx_person_username ON person(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_email ON person(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_role ON person(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_names ON person(first_name, last_name) WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_deleted_at ON person(deleted_at);

-- Step 10: Create updated_at trigger for person table
CREATE TRIGGER update_person_updated_at BEFORE UPDATE ON person
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Update relations table to reference 'person' instead of 'personnel'
-- This is complex, so we'll handle it in application code or a separate migration
-- For now, we'll keep the relations table as-is but update entity_type values later

COMMENT ON TABLE person IS 'Unified person table - can represent system users, named individuals, or unnamed persons with relations';

