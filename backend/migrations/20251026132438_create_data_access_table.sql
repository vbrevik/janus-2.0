-- Create data_access table
CREATE TABLE IF NOT EXISTS data_access (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    data_classification VARCHAR(20) NOT NULL CHECK (data_classification IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET')),
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('READ', 'WRITE', 'DELETE')),
    granted_by INTEGER NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_future_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_access_personnel ON data_access(personnel_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_data_access_classification ON data_access(data_classification) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_data_access_status ON data_access(status) WHERE status = 'ACTIVE';

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_data_access_updated_at ON data_access;
CREATE TRIGGER update_data_access_updated_at
    BEFORE UPDATE ON data_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
