-- Seed <domain>.<action> permission keys for the SEC-02 write/mutation gates (11-04).
-- Idempotent: follows the INSERT ... ON CONFLICT structure of
-- 20251030160000_create_roles_permissions.sql. Keys already seeded there
-- (audit.read, person.write, organizations.write, roles.write, ...) are not repeated.

INSERT INTO permissions (key, description) VALUES
    ('access.write', 'Grant and revoke computer/data/physical access'),
    ('discussions.write', 'Create discussions and replies'),
    ('document_references.write', 'Create, update, upload and delete document references'),
    ('info_systems.write', 'Create, update and delete information systems'),
    ('nda.write', 'Create, sign, reject, update and revoke NDAs'),
    ('relations.write', 'Create, update and delete entity relations'),
    ('vendor_relations.write', 'Create and delete vendor relations')
ON CONFLICT (key) DO NOTHING;

-- Admin: all new keys (the original admin CROSS JOIN does not re-run for new rows)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
      'access.write','discussions.write','document_references.write',
      'info_systems.write','nda.write','relations.write','vendor_relations.write'
) WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: business-object writes. NOT access.write — issuing/revoking access
-- grants is a privileged security operation reserved for admin (least privilege).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
      'discussions.write','document_references.write',
      'info_systems.write','nda.write','relations.write','vendor_relations.write'
) WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Operator / viewer: no new write keys (least privilege).
