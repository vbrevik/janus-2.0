-- Align the nda table with the unified person model.
-- 20251101191000_rename_personnel_to_person renamed the personnel table to
-- person but missed nda's columns and issuer FK, leaving the code
-- (person_id / issued_by_person_id, FK -> person) out of sync with the schema
-- (personnel_id / issued_by, FK -> the legacy users table). Idempotent: safe
-- whether or not these changes were already applied by hand.

DO $$
BEGIN
    -- personnel_id -> person_id
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'nda' AND column_name = 'personnel_id') THEN
        ALTER TABLE nda RENAME COLUMN personnel_id TO person_id;
    END IF;

    -- issued_by -> issued_by_person_id
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'nda' AND column_name = 'issued_by') THEN
        ALTER TABLE nda RENAME COLUMN issued_by TO issued_by_person_id;
    END IF;
END $$;

-- Repoint the issuer FK from the legacy users table to person.
ALTER TABLE nda DROP CONSTRAINT IF EXISTS nda_issued_by_fkey;
ALTER TABLE nda ADD CONSTRAINT nda_issued_by_fkey
    FOREIGN KEY (issued_by_person_id) REFERENCES person(id) ON DELETE CASCADE;
