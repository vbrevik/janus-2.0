-- Add the enduser and official personas as valid roles and seed one login user
-- each. The frontend routes on admin/enduser/official personas, but person.role
-- only allowed the RBAC roles (admin/manager/operator/viewer), so these two
-- personas could never log in. Idempotent.

-- 1. Allow the two personas in person.role.
ALTER TABLE person DROP CONSTRAINT IF EXISTS person_role_check;
ALTER TABLE person ADD CONSTRAINT person_role_check
    CHECK (role IN ('admin', 'manager', 'operator', 'viewer', 'enduser', 'official'));

-- 2. Seed a user per persona (password: password123, bcrypt cost 12 — same hash
--    as the other seed users).
INSERT INTO person (username, password_hash, role, email)
SELECT v.username,
       '$2b$12$AGJy4fF9OGK19yHRCxG2Mu/Ju4E5i1RXnm.KYu.Oq3QUdf9vWOVG2',
       v.role,
       v.email
FROM (VALUES
    ('enduser', 'enduser', 'enduser@janus.local'),
    ('official', 'official', 'official@janus.local')
) AS v(username, role, email)
WHERE NOT EXISTS (SELECT 1 FROM person p WHERE p.username = v.username);
