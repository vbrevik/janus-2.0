-- Create the 8 digital-resource tables (RSRC-BE-01, schema only).
-- Additive on the repaired baseline; models/handlers/resolver/seed are later plans.
--
-- Design locks (see 11-RESEARCH §3, §6 and 11-CONTEXT D-01):
--   * Standalone TEXT ids throughout — NOT FKs into the SERIAL-int person/organizations
--     tables. resource_id/person_id/org_id are opaque string ids from the demo store.
--   * resource_networks/resource_platforms classification CHECK includes RESTRICTED
--     (5 levels). This is isolated to the resource tables and does NOT touch the
--     existing person.clearance_level 4-level CHECK.
--   * resource_applications has NO classification column — effective classification is
--     derived from the parent platform at resolution time (RSRC-02 prohibition).

-- Table 1: resource_networks
CREATE TABLE IF NOT EXISTS resource_networks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN (
        'UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: resource_platforms
CREATE TABLE IF NOT EXISTS resource_platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN (
        'UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'
    )),
    network_id TEXT NOT NULL,  -- standalone string FK to resource_networks.id
    CONSTRAINT fk_platform_network FOREIGN KEY (network_id)
        REFERENCES resource_networks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: resource_applications (NO classification column — derived from parent platform)
CREATE TABLE IF NOT EXISTS resource_applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    CONSTRAINT fk_application_platform FOREIGN KEY (platform_id)
        REFERENCES resource_platforms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 4: resource_org_links
CREATE TABLE IF NOT EXISTS resource_org_links (
    id SERIAL PRIMARY KEY,
    resource_id TEXT NOT NULL,       -- any tier node id (network/platform/application)
    resource_tier TEXT NOT NULL CHECK (resource_tier IN ('NETWORK', 'PLATFORM', 'APPLICATION')),
    org_id TEXT NOT NULL,            -- UnitId string e.g. "MILITARY_1"
    role TEXT NOT NULL,              -- BaselineOrgRole or open string
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_resource_org_links_resource ON resource_org_links(resource_id);

-- Table 5: resource_policies
CREATE TABLE IF NOT EXISTS resource_policies (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    zone_prereq_id TEXT,             -- standalone string, no FK (zone table lives in demo store)
    gates JSONB NOT NULL             -- stores GateDescriptor[] as a JSON array
);

-- Table 6: resource_policy_assignments
CREATE TABLE IF NOT EXISTS resource_policy_assignments (
    id SERIAL PRIMARY KEY,
    resource_id TEXT NOT NULL,
    resource_tier TEXT NOT NULL CHECK (resource_tier IN ('NETWORK', 'PLATFORM', 'APPLICATION')),
    policy_id TEXT NOT NULL REFERENCES resource_policies(id) ON DELETE CASCADE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_resource ON resource_policy_assignments(resource_id);

-- Table 7: resource_access_grants
CREATE TABLE IF NOT EXISTS resource_access_grants (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,         -- standalone subject id string (e.g. "subj-1")
    resource_id TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_grant UNIQUE (person_id, resource_id, valid_from, valid_until)
);
CREATE INDEX IF NOT EXISTS idx_resource_grants_resource ON resource_access_grants(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_grants_person ON resource_access_grants(person_id);

-- Table 8: resource_access_delegates
CREATE TABLE IF NOT EXISTS resource_access_delegates (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    delegate_type TEXT NOT NULL CHECK (delegate_type IN ('PERSON', 'ORG')),
    delegate_person_id TEXT,
    delegate_org_id TEXT,
    granted_by_org_id TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    CONSTRAINT chk_delegate_target CHECK (
        (delegate_type = 'PERSON' AND delegate_person_id IS NOT NULL AND delegate_org_id IS NULL) OR
        (delegate_type = 'ORG' AND delegate_org_id IS NOT NULL AND delegate_person_id IS NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_delegates_resource ON resource_access_delegates(resource_id);
