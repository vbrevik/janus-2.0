-- Roles and permissions

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed default roles matching existing users.role values
INSERT INTO roles (name, description)
VALUES
('admin', 'Full access'),
('manager', 'Manage most resources'),
('operator', 'Operate daily tasks'),
('viewer', 'Read-only')
ON CONFLICT (name) DO NOTHING;

-- Seed default permissions
INSERT INTO permissions (key, description) VALUES
('audit.read', 'Read audit logs'),
('audit.write', 'Write audit entries programmatically'),
('personnel.read', 'Read personnel'),
('personnel.write', 'Write personnel'),
('vendors.read', 'Read vendors'),
('vendors.write', 'Write vendors')
ON CONFLICT (key) DO NOTHING;

-- Grant default permissions
-- Admin: all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: read/write most business objects, read audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'audit.read','personnel.read','personnel.write','vendors.read','vendors.write'
) WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Operator: read personnel/vendors
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'personnel.read','vendors.read'
) WHERE r.name = 'operator'
ON CONFLICT DO NOTHING;

-- Viewer: read-only minimal
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'personnel.read','vendors.read'
) WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;


