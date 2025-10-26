-- Create info_systems table
CREATE TABLE IF NOT EXISTS info_systems (
    id SERIAL PRIMARY KEY,
    system_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('DEV', 'TEST', 'PROD')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
    ip_address VARCHAR(45), -- IPv6 compatible
    domain VARCHAR(255),
    managed_by VARCHAR(100),
    last_audit_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_info_systems_name ON info_systems(system_name);
CREATE INDEX idx_info_systems_environment ON info_systems(environment);
CREATE INDEX idx_info_systems_status ON info_systems(status);

-- Create trigger to update updated_at
CREATE TRIGGER update_info_systems_updated_at
    BEFORE UPDATE ON info_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial seed data
INSERT INTO info_systems (system_name, description, environment, status, domain, managed_by) VALUES
('Domain Controller', 'Windows Active Directory domain controller', 'PROD', 'ACTIVE', 'ad.corp.local', 'IT Operations'),
('File Server', 'Network file storage server', 'PROD', 'ACTIVE', 'files.corp.local', 'IT Operations'),
('Email Server', 'Corporate email system', 'PROD', 'ACTIVE', 'mail.corp.local', 'IT Operations'),
('Web Server', 'Public-facing web server', 'PROD', 'ACTIVE', 'www.corp.local', 'IT Operations'),
('Database Server', 'Primary database server', 'PROD', 'ACTIVE', 'db.corp.local', 'IT Operations');

