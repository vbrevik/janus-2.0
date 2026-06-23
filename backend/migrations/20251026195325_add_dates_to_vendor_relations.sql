-- Add date fields to vendor_relations for tracking relationship validity
ALTER TABLE vendor_relations
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP;

-- Add constraint to ensure valid_from <= valid_until
ALTER TABLE vendor_relations
DROP CONSTRAINT IF EXISTS check_valid_period;
ALTER TABLE vendor_relations
ADD CONSTRAINT check_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from);

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_vendor_relations_valid_from ON vendor_relations(valid_from);
CREATE INDEX IF NOT EXISTS idx_vendor_relations_valid_until ON vendor_relations(valid_until);

-- Update comments
COMMENT ON COLUMN vendor_relations.valid_from IS 'Date when the relationship becomes active';
COMMENT ON COLUMN vendor_relations.valid_until IS 'Date when the relationship expires (NULL for ongoing relationships)';

