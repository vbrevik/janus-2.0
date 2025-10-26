-- Create vendor_relations table for flexible vendor relationships
-- Supports: sub-vendors, employees, consultants, and future relation types

CREATE TABLE vendor_relations (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    related_vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    related_personnel_id INTEGER REFERENCES personnel(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN ('sub_vendor', 'employee', 'consultant', 'partner', 'subcontractor')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure either vendor or personnel is linked, but not both
    CONSTRAINT chk_related_target CHECK (
        (related_vendor_id IS NOT NULL AND related_personnel_id IS NULL) OR
        (related_vendor_id IS NULL AND related_personnel_id IS NOT NULL)
    ),
    
    -- Prevent self-reference
    CONSTRAINT chk_no_self_reference CHECK (related_vendor_id != vendor_id),
    
    -- Unique constraint: same vendor + relation type + related entity
    CONSTRAINT uq_vendor_relation UNIQUE (vendor_id, related_vendor_id, related_personnel_id, relation_type)
);

-- Create indexes for performance
CREATE INDEX idx_vendor_relations_vendor_id ON vendor_relations(vendor_id);
CREATE INDEX idx_vendor_relations_related_vendor_id ON vendor_relations(related_vendor_id);
CREATE INDEX idx_vendor_relations_related_personnel_id ON vendor_relations(related_personnel_id);
CREATE INDEX idx_vendor_relations_type ON vendor_relations(relation_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_relations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_relations_updated_at
    BEFORE UPDATE ON vendor_relations
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_relations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE vendor_relations IS 'Flexible relationship table linking vendors to other vendors (sub-vendors) or personnel (employees, consultants)';
COMMENT ON COLUMN vendor_relations.vendor_id IS 'The parent vendor';
COMMENT ON COLUMN vendor_relations.related_vendor_id IS 'Related vendor (for sub-vendor, subcontractor relationships)';
COMMENT ON COLUMN vendor_relations.related_personnel_id IS 'Related personnel (for employee, consultant relationships)';
COMMENT ON COLUMN vendor_relations.relation_type IS 'Type of relationship: sub_vendor, employee, consultant, partner, subcontractor';
