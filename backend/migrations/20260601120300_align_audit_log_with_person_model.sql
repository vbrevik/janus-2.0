-- Align audit_log with the unified person model: user_id -> person_id and
-- repoint the FK from the legacy users table to person. The code already
-- reads and writes person_id, so audit reads 500'd (no such column) and audit
-- writes silently failed (create_audit_log ignores its error). Idempotent.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'audit_log' AND column_name = 'user_id') THEN
        ALTER TABLE audit_log RENAME COLUMN user_id TO person_id;
    END IF;
END $$;

-- Repoint the FK to person. ON DELETE SET NULL keeps audit history when the
-- acting person is removed (person_id is nullable).
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_person_id_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE SET NULL;
