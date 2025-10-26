-- Create computer_access table
CREATE TABLE IF NOT EXISTS computer_access (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    system_name VARCHAR(100) NOT NULL,
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('READ', 'WRITE', 'ADMIN')),
    granted_by INTEGER NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_future_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Create indexes
CREATE INDEX idx_computer_access_personnel ON computer_access(personnel_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_computer_access_status ON computer_access(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_computer_access_expires ON computer_access(expires_at) WHERE expires_at IS NOT NULL;

-- Create trigger to update updated_at
CREATE TRIGGER update_computer_access_updated_at
    BEFORE UPDATE ON computer_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
