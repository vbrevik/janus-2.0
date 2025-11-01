-- Create unified relations table for all entity relationships
-- Supports: Personnel-Personnel, Personnel-Vendor, Vendor-Vendor, Vendor-Personnel

CREATE TABLE IF NOT EXISTS relations (
    id SERIAL PRIMARY KEY,
    
    -- Source entity
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('personnel', 'vendor')),
    entity_id INTEGER NOT NULL,
    
    -- Target entity
    related_entity_type VARCHAR(20) NOT NULL CHECK (related_entity_type IN ('personnel', 'vendor')),
    related_entity_id INTEGER NOT NULL,
    
    -- Relation metadata
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN (
        -- Vendor -> Vendor
        'sub_vendor', 'subcontractor',
        -- Vendor -> Personnel or Personnel -> Vendor
        'employee', 'consultant', 'partner',
        -- Personnel -> Personnel
        'manager', 'supervisor', 'subordinate', 'reports_to', 'colleague', 'peer', 'team_member'
    )),
    notes TEXT,
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT chk_no_self_reference CHECK (
        NOT (entity_type = related_entity_type AND entity_id = related_entity_id)
    ),
    
    -- Unique constraint: prevent duplicate relations
    CONSTRAINT uq_relation UNIQUE (entity_type, entity_id, related_entity_type, related_entity_id, relation_type)
    
    -- Note: Foreign key validation must be done in application code or via triggers
    -- since CHECK constraints cannot use subqueries
);

-- Create indexes for performance
CREATE INDEX idx_relations_entity ON relations(entity_type, entity_id);
CREATE INDEX idx_relations_related_entity ON relations(related_entity_type, related_entity_id);
CREATE INDEX idx_relations_type ON relations(relation_type);
CREATE INDEX idx_relations_valid_from ON relations(valid_from);
CREATE INDEX idx_relations_valid_until ON relations(valid_until);

-- Create updated_at trigger
CREATE TRIGGER update_relations_updated_at
    BEFORE UPDATE ON relations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE relations IS 'Unified relationship table for all entity types (personnel and vendors)';
COMMENT ON COLUMN relations.entity_type IS 'Type of source entity: personnel or vendor';
COMMENT ON COLUMN relations.entity_id IS 'ID of source entity';
COMMENT ON COLUMN relations.related_entity_type IS 'Type of target entity: personnel or vendor';
COMMENT ON COLUMN relations.related_entity_id IS 'ID of target entity';
COMMENT ON COLUMN relations.relation_type IS 'Type of relationship between entities';

-- Migrate existing vendor_relations data to unified relations table
INSERT INTO relations (
    entity_type, entity_id, related_entity_type, related_entity_id, 
    relation_type, notes, valid_from, valid_until, created_at, updated_at
)
SELECT 
    'vendor' as entity_type,
    vendor_id as entity_id,
    CASE 
        WHEN related_vendor_id IS NOT NULL THEN 'vendor'
        WHEN related_personnel_id IS NOT NULL THEN 'personnel'
    END as related_entity_type,
    COALESCE(related_vendor_id, related_personnel_id) as related_entity_id,
    relation_type,
    notes,
    valid_from,
    valid_until,
    created_at,
    updated_at
FROM vendor_relations
WHERE (deleted_at IS NULL OR deleted_at IS NOT NULL);  -- Include all rows, deleted_at may not exist

