-- Create NDA (Non-Disclosure Agreement) table
CREATE TABLE IF NOT EXISTS nda (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SIGNED', 'EXPIRED', 'REVOKED')),
    issued_by INTEGER NOT NULL REFERENCES users(id),
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    signed_at TIMESTAMP,
    expires_at TIMESTAMP,
    signature VARCHAR(500), -- Base64 encoded signature or signature data
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_signed_timestamp CHECK (signed_at IS NULL OR signed_at >= issued_at),
    CONSTRAINT check_expiry CHECK (expires_at IS NULL OR expires_at > issued_at),
    CONSTRAINT check_signature_required CHECK (
        (status = 'SIGNED' AND signature IS NOT NULL AND signed_at IS NOT NULL) OR
        (status != 'SIGNED')
    )
);

-- Create indexes (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_nda_personnel ON nda(personnel_id);
CREATE INDEX IF NOT EXISTS idx_nda_status ON nda(status);
CREATE INDEX IF NOT EXISTS idx_nda_lockdownd ON nda(signed_at) WHERE signed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nda_expires ON nda(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nda_issued_by ON nda(issued_by);

-- Create trigger to update updated_at (DROP IF EXISTS for idempotency)
DROP TRIGGER IF EXISTS update_nda_updated_at ON nda;
CREATE TRIGGER update_nda_updated_at
    BEFORE UPDATE ON nda
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE nda IS 'Non-Disclosure Agreements for personnel';
COMMENT ON COLUMN nda.personnel_id IS 'The personnel who needs to sign the NDA';
COMMENT ON COLUMN nda.status IS 'Current status: PENDING (issued, not signed), ACTIVE (ready to sign), SIGNED (completed), EXPIRED, REVOKED';
COMMENT ON COLUMN nda.signature IS 'Signature data (could be Base64 signature, IP address, or timestamp confirmation)';

