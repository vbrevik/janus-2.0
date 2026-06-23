-- Migration: Update relations table to use 'person' instead of 'personnel'
-- Run this after the person table migration is complete

UPDATE relations 
SET entity_type = 'person' 
WHERE entity_type = 'personnel';

UPDATE relations 
SET related_entity_type = 'person' 
WHERE related_entity_type = 'personnel';

-- Update the CHECK constraint to allow 'person' instead of 'personnel'
ALTER TABLE relations 
    DROP CONSTRAINT IF EXISTS relations_entity_type_check,
    ADD CONSTRAINT relations_entity_type_check CHECK (entity_type IN ('person', 'vendor'));

ALTER TABLE relations 
    DROP CONSTRAINT IF EXISTS relations_related_entity_type_check,
    ADD CONSTRAINT relations_related_entity_type_check CHECK (related_entity_type IN ('person', 'vendor'));

COMMENT ON COLUMN relations.entity_type IS 'Type of entity: person or vendor';
COMMENT ON COLUMN relations.related_entity_type IS 'Type of related entity: person or vendor';

