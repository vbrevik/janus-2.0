-- Gap closure (11-04 / verifier): uq_grant treated NULLs as distinct (Postgres
-- default), so ON CONFLICT DO NOTHING in issue_grant never fired for the
-- endpoint's default request shape (valid_from/valid_until both null),
-- producing duplicate grant rows (ROADMAP SC 4 / RSRC-BE-04).
--
-- Fix: dedupe existing null-window duplicates, then recreate uq_grant as
-- UNIQUE NULLS NOT DISTINCT (PostgreSQL 15+; server is 15.x).
-- Idempotent: the dedupe is a no-op on clean data and the constraint is
-- dropped IF EXISTS before being re-added.

-- 1) Dedupe: keep one row per natural key, treating NULL window bounds as equal.
DELETE FROM resource_access_grants a
USING resource_access_grants b
WHERE a.ctid > b.ctid
  AND a.person_id = b.person_id
  AND a.resource_id = b.resource_id
  AND a.valid_from IS NOT DISTINCT FROM b.valid_from
  AND a.valid_until IS NOT DISTINCT FROM b.valid_until;

-- 2) Recreate the constraint with NULLS NOT DISTINCT so null-windowed grants
--    conflict (and the handler's ON CONFLICT clause fires).
ALTER TABLE resource_access_grants DROP CONSTRAINT IF EXISTS uq_grant;
ALTER TABLE resource_access_grants
  ADD CONSTRAINT uq_grant UNIQUE NULLS NOT DISTINCT (person_id, resource_id, valid_from, valid_until);
