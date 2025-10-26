-- Create vendors table for managing vendor records
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    contact_phone VARCHAR(20),
    clearance_level VARCHAR(50) NOT NULL CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET')),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_vendors_company_name ON vendors(company_name);
CREATE INDEX idx_vendors_contact_email ON vendors(contact_email);
CREATE INDEX idx_vendors_clearance ON vendors(clearance_level);
CREATE INDEX idx_vendors_contract_number ON vendors(contract_number);
CREATE INDEX idx_vendors_deleted_at ON vendors(deleted_at);

-- Create updated_at trigger
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
