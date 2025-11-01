-- Migration: Drop old users and personnel tables after migration to person table
-- Run this AFTER data has been verified in the person table

-- Step 1: Drop old tables (CASCADE will drop any remaining foreign keys)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;

-- Step 2: Update relations table entity_type from 'personnel' to 'person'
-- This needs to happen after the person table exists and data is migrated
UPDATE relations 
SET entity_type = 'person' 
WHERE entity_type = 'personnel';

UPDATE relations 
SET related_entity_type = 'person' 
WHERE related_entity_type = 'personnel';

-- Step 3: Update vendor_relations to use person terminology if needed
-- (No changes needed here as we renamed the column already)

COMMENT ON TABLE person IS 'Unified person table - replaces users and personnel tables';

