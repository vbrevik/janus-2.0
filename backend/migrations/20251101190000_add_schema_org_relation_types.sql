-- Add Schema.org based person-to-person relation types
-- Based on https://schema.org/Person properties

ALTER TABLE relations 
DROP CONSTRAINT IF EXISTS relations_relation_type_check;

ALTER TABLE relations
ADD CONSTRAINT relations_relation_type_check CHECK (relation_type IN (
    -- Organization -> Organization
    'sub_vendor', 'subcontractor',
    -- Organization -> Person or Person -> Organization
    'employee', 'consultant', 'partner',
    -- Person -> Person (Professional/Organizational)
    'manager', 'supervisor', 'subordinate', 'reports_to', 'colleague', 'peer', 'team_member',
    -- Person -> Person (Schema.org Personal Relations)
    'knows',          -- Schema.org: knows (generic bi-directional social or work relation)
    'related_to',     -- Schema.org: relatedTo (generic familial relation)
    'parent',         -- Schema.org: parent
    'child',          -- Schema.org: child/children
    'sibling',        -- Schema.org: sibling
    'spouse',         -- Schema.org: spouse
    'follows'         -- Schema.org: follows (uni-directional social relation)
));

COMMENT ON COLUMN relations.relation_type IS 'Type of relationship. Includes Schema.org Person properties: knows, related_to, parent, child, sibling, spouse, follows, colleague';

