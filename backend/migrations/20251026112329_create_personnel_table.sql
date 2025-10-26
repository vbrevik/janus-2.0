-- Create personnel table for managing personnel records
CREATE TABLE IF NOT EXISTS personnel (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    clearance_level VARCHAR(50) NOT NULL CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET')),
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_personnel_email ON personnel(email);
CREATE INDEX idx_personnel_clearance ON personnel(clearance_level);
CREATE INDEX idx_personnel_department ON personnel(department);
CREATE INDEX idx_personnel_deleted_at ON personnel(deleted_at);

-- Full name search index
CREATE INDEX idx_personnel_names ON personnel(first_name, last_name);

-- Create updated_at trigger
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
