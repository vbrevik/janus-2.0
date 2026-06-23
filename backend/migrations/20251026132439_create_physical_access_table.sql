-- Create physical_access table
CREATE TABLE IF NOT EXISTS physical_access (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('VISITOR', 'STANDARD', 'RESTRICTED', 'FULL')),
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    granted_by INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_physical_access_personnel ON physical_access(personnel_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_physical_access_zone ON physical_access(zone_name) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_physical_access_valid_until ON physical_access(valid_until) WHERE valid_until IS NOT NULL;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_physical_access_updated_at ON physical_access;
CREATE TRIGGER update_physical_access_updated_at
    BEFORE UPDATE ON physical_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
