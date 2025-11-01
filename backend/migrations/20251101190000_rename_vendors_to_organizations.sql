-- Rename vendors table to organizations
ALTER TABLE vendors RENAME TO organizations;

-- Rename indexes
ALTER INDEX idx_vendors_company_name RENAME TO idx_organizations_company_name;
ALTER INDEX idx_vendors_contact_email RENAME TO idx_organizations_contact_email;
ALTER INDEX idx_vendors_clearance RENAME TO idx_organizations_clearance;
ALTER INDEX idx_vendors_contract_number RENAME TO idx_organizations_contract_number;
ALTER INDEX idx_vendors_deleted_at RENAME TO idx_organizations_deleted_at;

-- Rename trigger
DROP TRIGGER IF EXISTS update_vendors_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update vendor_relations to reference organizations
ALTER TABLE vendor_relations RENAME COLUMN vendor_id TO organization_id;

-- Update any foreign key constraints (if they exist with names)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_relations_vendor_id_fkey') THEN
        ALTER TABLE vendor_relations RENAME CONSTRAINT vendor_relations_vendor_id_fkey TO vendor_relations_organization_id_fkey;
    END IF;
END $$;

-- Update relations table entity_type values
UPDATE relations SET entity_type = 'ORGANIZATION' WHERE entity_type = 'VENDOR';
UPDATE relations SET related_entity_type = 'ORGANIZATION' WHERE related_entity_type = 'VENDOR';

-- Update audit log resource_type values
UPDATE audit_log SET resource_type = 'ORGANIZATION' WHERE resource_type = 'VENDOR';

-- Update permissions
UPDATE permissions SET key = 'organizations.read' WHERE key = 'vendors.read';
UPDATE permissions SET key = 'organizations.write' WHERE key = 'vendors.write';

