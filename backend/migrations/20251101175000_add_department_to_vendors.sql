-- Add department field to vendors table
-- This allows departments to exist in the vendor structure

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Create index for department lookups
CREATE INDEX IF NOT EXISTS idx_vendors_department ON vendors(department) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN vendors.department IS 'Department name - must match departments used in personnel records';

