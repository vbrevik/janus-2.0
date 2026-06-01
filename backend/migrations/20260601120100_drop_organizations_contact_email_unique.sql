-- Allow organizations to share a contact person.
-- The create UI derives the contact name/email from a reusable person record,
-- so two organizations can legitimately have the same contact. The legacy
-- vendors_contact_email_key UNIQUE constraint contradicted that and rejected
-- such creates with a 500. Idempotent.
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS vendors_contact_email_key;
