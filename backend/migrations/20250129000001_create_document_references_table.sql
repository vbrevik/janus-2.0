-- Create document_references table for physical documents (paper-based)
CREATE TABLE IF NOT EXISTS document_references (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'security_brief' CHECK (document_type IN ('security_brief', 'briefing', 'report', 'certification', 'other')),
    description TEXT,
    issued_date DATE,
    location VARCHAR(255), -- Where the physical document is stored
    self_reported_by INTEGER NOT NULL REFERENCES users(id),
    self_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by INTEGER REFERENCES users(id), -- Admin can verify
    verified_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_document_references_personnel ON document_references(personnel_id);
CREATE INDEX IF NOT EXISTS idx_document_references_type ON document_references(document_type);
CREATE INDEX IF NOT EXISTS idx_document_references_status ON document_references(status);
CREATE INDEX IF NOT EXISTS idx_document_references_issued_date ON document_references(issued_date);

-- Create trigger to update updated_at (DROP IF EXISTS for idempotency)
DROP TRIGGER IF EXISTS update_document_references_updated_at ON document_references;
CREATE TRIGGER update_document_references_updated_at
    BEFORE UPDATE ON document_references
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE document_references IS 'References to physical documents (paper-based) that exist only in physical form';
COMMENT ON COLUMN document_references.document_type IS 'Type of document: security_brief, briefing, report, certification, other';
COMMENT ON COLUMN document_references.self_reported_by IS 'User who reported/created the reference to the physical document';
COMMENT ON COLUMN document_references.status IS 'Status: PENDING (awaiting verification), VERIFIED (admin verified), REJECTED';





