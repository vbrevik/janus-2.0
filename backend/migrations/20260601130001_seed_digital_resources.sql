-- Seed the 6-unit digital-resource dataset (RSRC-BE-05, Plan 03).
--
-- Source of truth: frontend/src/demo/lib/seed.ts (D-04).
-- Hand-ported from: RESOURCE_NODES, PLATFORMS, APPLICATIONS, per-node org_links,
--   RSRC_POLICIES, per-node policy_assignments, RESOURCE_GRANTS, RSRC_DELEGATES.
-- NOTE: The flat ORG_LINKS / POLICY_ASSIGNMENTS exports in seed.ts lack resource_id;
--   the per-node arrays embedded in RESOURCE_NODES/PLATFORMS/APPLICATIONS are the
--   authoritative mapping and are used here.
--
-- Field mapping (seed.ts → DB):
--   RESOURCE_NODES        → resource_networks          (TEXT PK, id ON CONFLICT DO NOTHING)
--   PLATFORMS             → resource_platforms         (TEXT PK, id ON CONFLICT DO NOTHING)
--   APPLICATIONS          → resource_applications      (TEXT PK, id ON CONFLICT DO NOTHING)
--   per-node org_links    → resource_org_links         (SERIAL PK, WHERE NOT EXISTS guard)
--   RSRC_POLICIES         → resource_policies          (TEXT PK, id ON CONFLICT DO NOTHING)
--   per-node policy_assignments → resource_policy_assignments (SERIAL PK, WHERE NOT EXISTS guard)
--   RESOURCE_GRANTS       → resource_access_grants     (TEXT PK, id ON CONFLICT DO NOTHING)
--   RSRC_DELEGATES        → resource_access_delegates  (TEXT PK, id ON CONFLICT DO NOTHING)
--
-- GateDescriptor gates arrays are stored as JSONB.
-- valid_from / valid_until Date values are converted to TIMESTAMPTZ literals; null = NULL.
-- Re-running this migration is a no-op (idempotent).
--
-- Seeded counts: 6 networks | 4 platforms | 4 applications | 18 org_links |
--                3 policies | 15 policy_assignments | 18 grants | 1 delegate

-- ==========================================================================
-- 1. resource_policies (must come before policy_assignments FK)
-- ==========================================================================

INSERT INTO resource_policies (id, label, gates, zone_prereq_id) VALUES
  (
    'rsrc-pol-baseline',
    'Baseline access policy',
    '[{"kind":"CLEARANCE"},{"kind":"OWN_TIER_GRANT"},{"kind":"PARENT_TIER_GRANT"}]'::jsonb,
    NULL
  ),
  (
    'rsrc-pol-restricted',
    'Post-incident policy',
    '[{"kind":"CLEARANCE"},{"kind":"OWN_TIER_GRANT"},{"kind":"PARENT_TIER_GRANT"},{"kind":"REQUIRED_ROLE","role":"SECURITY_APPROVAL"}]'::jsonb,
    NULL
  ),
  (
    'rsrc-pol-non-baseline',
    'Enhanced access policy',
    '[{"kind":"CLEARANCE"},{"kind":"OWN_TIER_GRANT"},{"kind":"PARENT_TIER_GRANT"},{"kind":"REQUIRED_ROLE","role":"SECURITY_APPROVAL"}]'::jsonb,
    'zone-room-sr1'
  )
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 2. resource_networks (6 rows — RSRC-SEED-01)
-- ==========================================================================

INSERT INTO resource_networks (id, name, classification) VALUES
  ('rsrc-milnet',        'MilNet',        'SECRET'),
  ('rsrc-milnet-tac',   'TacNet-Mil2',   'SECRET'),
  ('rsrc-intelnet',     'IntelNet',      'TOP_SECRET'),
  ('rsrc-infrastructure','InfraNet',     'CONFIDENTIAL'),
  ('rsrc-industry',     'IndusNet',      'RESTRICTED'),
  ('rsrc-homeguard',    'HomeGuardNet',  'UNCLASSIFIED')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 3. resource_platforms (4 rows — RSRC-SEED-02)
-- ==========================================================================

INSERT INTO resource_platforms (id, name, classification, network_id) VALUES
  ('rsrc-milpl-1',   'MilPlatform-1',   'SECRET',       'rsrc-milnet'),
  ('rsrc-tacpl-1',   'TacPlatform-1',   'SECRET',       'rsrc-milnet-tac'),
  ('rsrc-intpl-1',   'IntelPlatform-1', 'TOP_SECRET',   'rsrc-intelnet'),
  ('rsrc-infrapl-1', 'InfraPlatform-1', 'CONFIDENTIAL', 'rsrc-infrastructure')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 4. resource_applications (4 rows — RSRC-SEED-03, NO classification column)
-- ==========================================================================

INSERT INTO resource_applications (id, name, platform_id) VALUES
  ('rsrc-milapp-1',   'MilApp-1',   'rsrc-milpl-1'),
  ('rsrc-tacapp-1',   'TacApp-1',   'rsrc-tacpl-1'),
  ('rsrc-intapp-1',   'IntelApp-1', 'rsrc-intpl-1'),
  ('rsrc-infraapp-1', 'InfraApp-1', 'rsrc-infrapl-1')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 5. resource_org_links (18 rows — one per embedded org_link in seed nodes)
-- Idempotent via WHERE NOT EXISTS on natural key (no UNIQUE constraint).
-- ==========================================================================

-- MilNet (NETWORK) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-milnet', 'NETWORK', 'MILITARY_1', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-milnet' AND org_id = 'MILITARY_1' AND role = 'ADMIN'
);

-- TacNet (NETWORK) — 2 links
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-milnet-tac', 'NETWORK', 'MILITARY_2', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-milnet-tac' AND org_id = 'MILITARY_2' AND role = 'ADMIN'
);
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-milnet-tac', 'NETWORK', 'MILITARY_2', 'OPERATOR', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-milnet-tac' AND org_id = 'MILITARY_2' AND role = 'OPERATOR'
);

-- IntelNet (NETWORK) — 2 links
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-intelnet', 'NETWORK', 'INTEL', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-intelnet' AND org_id = 'INTEL' AND role = 'ADMIN'
);
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-intelnet', 'NETWORK', 'MILITARY_1', 'SECURITY_APPROVAL', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-intelnet' AND org_id = 'MILITARY_1' AND role = 'SECURITY_APPROVAL'
);

-- InfraNet (NETWORK) — 2 links
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-infrastructure', 'NETWORK', 'INFRA', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-infrastructure' AND org_id = 'INFRA' AND role = 'ADMIN'
);
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-infrastructure', 'NETWORK', 'INFRA', 'OPERATOR', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-infrastructure' AND org_id = 'INFRA' AND role = 'OPERATOR'
);

-- IndusNet (NETWORK) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-industry', 'NETWORK', 'INDUSTRY', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-industry' AND org_id = 'INDUSTRY' AND role = 'ADMIN'
);

-- HomeGuardNet (NETWORK) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-homeguard', 'NETWORK', 'HOME_GUARD', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-homeguard' AND org_id = 'HOME_GUARD' AND role = 'ADMIN'
);

-- MilPlatform-1 (PLATFORM) — 2 links
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-milpl-1', 'PLATFORM', 'MILITARY_1', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-milpl-1' AND org_id = 'MILITARY_1' AND role = 'ADMIN'
);
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-milpl-1', 'PLATFORM', 'MILITARY_1', 'ASSET_OWNER', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-milpl-1' AND org_id = 'MILITARY_1' AND role = 'ASSET_OWNER'
);

-- TacPlatform-1 (PLATFORM) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-tacpl-1', 'PLATFORM', 'MILITARY_2', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-tacpl-1' AND org_id = 'MILITARY_2' AND role = 'ADMIN'
);

-- IntelPlatform-1 (PLATFORM) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-intpl-1', 'PLATFORM', 'INTEL', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-intpl-1' AND org_id = 'INTEL' AND role = 'ADMIN'
);

-- InfraPlatform-1 (PLATFORM) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-infrapl-1', 'PLATFORM', 'INFRA', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-infrapl-1' AND org_id = 'INFRA' AND role = 'ADMIN'
);

-- MilApp-1 (APPLICATION) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-milapp-1', 'APPLICATION', 'MILITARY_1', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-milapp-1' AND org_id = 'MILITARY_1' AND role = 'ADMIN'
);

-- TacApp-1 (APPLICATION) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-tacapp-1', 'APPLICATION', 'MILITARY_2', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-tacapp-1' AND org_id = 'MILITARY_2' AND role = 'ADMIN'
);

-- IntelApp-1 (APPLICATION) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-intapp-1', 'APPLICATION', 'INTEL', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-intapp-1' AND org_id = 'INTEL' AND role = 'ADMIN'
);

-- InfraApp-1 (APPLICATION) — 1 link
INSERT INTO resource_org_links (resource_id, resource_tier, org_id, role, valid_from, valid_until)
SELECT 'rsrc-infraapp-1', 'APPLICATION', 'INFRA', 'ADMIN', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_org_links
  WHERE resource_id = 'rsrc-infraapp-1' AND org_id = 'INFRA' AND role = 'ADMIN'
);

-- ==========================================================================
-- 6. resource_policy_assignments (15 rows)
-- Idempotent via WHERE NOT EXISTS on natural key (resource_id, policy_id, valid_from, valid_until).
-- ==========================================================================

-- MilNet — 2 assignments (policy-shift story)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-milnet', 'NETWORK', 'rsrc-pol-baseline', NULL, '2026-02-28T23:59:59Z'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-milnet' AND policy_id = 'rsrc-pol-baseline'
    AND valid_until IS NOT DISTINCT FROM '2026-02-28T23:59:59Z'::timestamptz
);
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-milnet', 'NETWORK', 'rsrc-pol-restricted', '2026-03-01T00:00:00Z'::timestamptz, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-milnet' AND policy_id = 'rsrc-pol-restricted'
    AND valid_from IS NOT DISTINCT FROM '2026-03-01T00:00:00Z'::timestamptz
);

-- TacNet — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-milnet-tac', 'NETWORK', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-milnet-tac' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- IntelNet — 1 assignment (non-baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-intelnet', 'NETWORK', 'rsrc-pol-non-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-intelnet' AND policy_id = 'rsrc-pol-non-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- InfraNet — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-infrastructure', 'NETWORK', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-infrastructure' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- IndusNet — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-industry', 'NETWORK', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-industry' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- HomeGuardNet — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-homeguard', 'NETWORK', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-homeguard' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- MilPlatform-1 — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-milpl-1', 'PLATFORM', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-milpl-1' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- TacPlatform-1 — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-tacpl-1', 'PLATFORM', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-tacpl-1' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- IntelPlatform-1 — 1 assignment (non-baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-intpl-1', 'PLATFORM', 'rsrc-pol-non-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-intpl-1' AND policy_id = 'rsrc-pol-non-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- InfraPlatform-1 — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-infrapl-1', 'PLATFORM', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-infrapl-1' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- MilApp-1 — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-milapp-1', 'APPLICATION', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-milapp-1' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- TacApp-1 — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-tacapp-1', 'APPLICATION', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-tacapp-1' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- IntelApp-1 — 1 assignment (non-baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-intapp-1', 'APPLICATION', 'rsrc-pol-non-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-intapp-1' AND policy_id = 'rsrc-pol-non-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- InfraApp-1 — 1 assignment (baseline permanent)
INSERT INTO resource_policy_assignments (resource_id, resource_tier, policy_id, valid_from, valid_until)
SELECT 'rsrc-infraapp-1', 'APPLICATION', 'rsrc-pol-baseline', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM resource_policy_assignments
  WHERE resource_id = 'rsrc-infraapp-1' AND policy_id = 'rsrc-pol-baseline'
    AND valid_from IS NULL AND valid_until IS NULL
);

-- ==========================================================================
-- 7. resource_access_grants (18 rows — RSRC-SEED-05)
-- ==========================================================================

INSERT INTO resource_access_grants (id, person_id, resource_id, valid_from, valid_until) VALUES
  -- NETWORK grants (expired / active / future on MilNet; active on TacNet, IntelNet, InfraNet)
  ('rsrc-grant-milnet-expired',  'subj-1', 'rsrc-milnet',         NULL,                         '2025-01-01T00:00:00Z'::timestamptz),
  ('rsrc-grant-milnet-active',   'subj-1', 'rsrc-milnet',         NULL,                         NULL),
  ('rsrc-grant-milnet-future',   'subj-1', 'rsrc-milnet',         '2027-01-01T00:00:00Z'::timestamptz, NULL),
  ('rsrc-grant-tacnet-active',   'subj-1', 'rsrc-milnet-tac',     NULL,                         NULL),
  ('rsrc-grant-intelnet-active', 'subj-1', 'rsrc-intelnet',       NULL,                         NULL),
  -- PLATFORM grants (expired / active / future on MilPlatform-1; active on TacPlat, IntelPlat)
  ('rsrc-grant-milpl-expired',   'subj-1', 'rsrc-milpl-1',        NULL,                         '2025-06-01T00:00:00Z'::timestamptz),
  ('rsrc-grant-milpl-active',    'subj-1', 'rsrc-milpl-1',        NULL,                         NULL),
  ('rsrc-grant-milpl-future',    'subj-1', 'rsrc-milpl-1',        '2027-06-01T00:00:00Z'::timestamptz, NULL),
  ('rsrc-grant-tacpl-active',    'subj-1', 'rsrc-tacpl-1',        NULL,                         NULL),
  ('rsrc-grant-intpl-active',    'subj-1', 'rsrc-intpl-1',        NULL,                         NULL),
  -- APPLICATION grants (expired / active / future on MilApp-1; active on TacApp, IntelApp)
  ('rsrc-grant-milapp-expired',  'subj-1', 'rsrc-milapp-1',       NULL,                         '2025-09-01T00:00:00Z'::timestamptz),
  ('rsrc-grant-milapp-active',   'subj-1', 'rsrc-milapp-1',       NULL,                         NULL),
  ('rsrc-grant-milapp-future',   'subj-1', 'rsrc-milapp-1',       '2027-09-01T00:00:00Z'::timestamptz, NULL),
  ('rsrc-grant-tacapp-active',   'subj-1', 'rsrc-tacapp-1',       NULL,                         NULL),
  ('rsrc-grant-intapp-active',   'subj-1', 'rsrc-intapp-1',       NULL,                         NULL),
  -- Infra grants (network, platform, app)
  ('rsrc-grant-infra-active',    'subj-1', 'rsrc-infrastructure', NULL,                         NULL),
  ('rsrc-grant-infrapl-active',  'subj-1', 'rsrc-infrapl-1',      NULL,                         NULL),
  ('rsrc-grant-infraapp-active', 'subj-1', 'rsrc-infraapp-1',     NULL,                         NULL)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 8. resource_access_delegates (1 row — RSRC_DELEGATES in seed.ts)
-- ==========================================================================

INSERT INTO resource_access_delegates
  (id, resource_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until)
VALUES
  -- MILITARY_1 (via INTEL) delegates IntelNet access authority to subj-2 (PERSON delegate)
  ('rsrc-delegate-subj2', 'rsrc-intelnet', 'PERSON', 'subj-2', NULL, 'INTEL', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
