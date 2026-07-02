// demo/lib/digital-resource-mapper.ts — raw backend response -> DigitalResourceWorld.
//
// The backend's GET /api/digital-resources/world response (Phase 11) is FLATTER
// than the frontend's per-node shape (Phase 9/10 model.ts): org_links and
// policy_assignments are top-level arrays keyed by resource_id + resource_tier,
// not embedded per-node. This module denormalizes: for each network/platform/
// application, it filters the flat arrays down to that node's own links/
// assignments and resolves policy_id -> the full ResourcePolicy object (the TS
// PolicyAssignment type nests the policy, never a bare id).
//
// Fail-closed convention (mirrors effectiveClassification in model.ts): a
// policy_assignments row referencing an unknown policy_id is a seed-integrity
// error and throws — it is never silently dropped or defaulted.

import type {
  ApplicationNode,
  Clearance,
  DigitalResourceWorld,
  GateDescriptor,
  NetworkNode,
  OrgLink,
  PlatformNode,
  PolicyAssignment,
  ResourceAccessDelegate,
  ResourceAccessGrant,
  ResourcePolicy,
} from "./model";

// --- Raw response shapes (field-for-field with backend/src/digital_resources/models.rs) ---
// Every date field is `string | null` (raw JSON) — never `Date`.

export interface RawResourceNetwork {
  id: string;
  name: string;
  classification: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface RawResourcePlatform {
  id: string;
  name: string;
  classification: string;
  network_id: string;
  created_at: string | null;
  updated_at: string | null;
}

// No classification column — derived from the host Platform (RSRC-02).
export interface RawResourceApplication {
  id: string;
  name: string;
  platform_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface RawOrgLink {
  id: number;
  resource_id: string;
  resource_tier: string;
  org_id: string;
  role: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface RawResourcePolicy {
  id: string;
  label: string;
  gates: unknown;
  zone_prereq_id: string | null;
}

export interface RawPolicyAssignment {
  id: number;
  resource_id: string;
  resource_tier: string;
  policy_id: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface RawResourceAccessGrant {
  id: string;
  person_id: string;
  resource_id: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface RawResourceAccessDelegate {
  id: string;
  resource_id: string;
  delegate_type: "PERSON" | "ORG";
  delegate_person_id: string | null;
  delegate_org_id: string | null;
  granted_by_org_id: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface DigitalResourceWorldResponse {
  networks: RawResourceNetwork[];
  platforms: RawResourcePlatform[];
  applications: RawResourceApplication[];
  org_links: RawOrgLink[];
  policies: RawResourcePolicy[];
  policy_assignments: RawPolicyAssignment[];
  grants: RawResourceAccessGrant[];
  delegates: RawResourceAccessDelegate[];
}

// --- Helpers ---

// Exported so 12-03's hooks file can reuse it for grant/delegate POST responses
// instead of duplicating date-parsing logic.
export function parseNullableDate(v: string | null): Date | null {
  return v === null ? null : new Date(v);
}

// Raw org-link -> OrgLink: drops id/resource_id/resource_tier, parses dates.
export function mapOrgLink(raw: RawOrgLink): OrgLink {
  return {
    org_id: raw.org_id,
    role: raw.role,
    valid_from: parseNullableDate(raw.valid_from),
    valid_until: parseNullableDate(raw.valid_until),
  };
}

function mapPolicy(raw: RawResourcePolicy): ResourcePolicy {
  return {
    id: raw.id,
    label: raw.label,
    // Backend serializes gates as a JSON array matching GateDescriptor's
    // #[serde(tag = "kind")] shape byte-for-byte — a type assertion only.
    gates: raw.gates as GateDescriptor[],
    zone_prereq_id: raw.zone_prereq_id,
  };
}

// Resolves policy_id -> the full ResourcePolicy object. Throws (fail-closed) if
// the referenced policy is missing from raw.policies — never silently dropped.
function mapPolicyAssignment(
  raw: RawPolicyAssignment,
  policies: RawResourcePolicy[],
): PolicyAssignment {
  const policy = policies.find((p) => p.id === raw.policy_id);
  if (!policy) {
    throw new Error(
      `mapWorldResponse: policy_assignments row references unknown policy_id "${raw.policy_id}" (resource "${raw.resource_id}", tier "${raw.resource_tier}")`,
    );
  }
  return {
    policy: mapPolicy(policy),
    valid_from: parseNullableDate(raw.valid_from),
    valid_until: parseNullableDate(raw.valid_until),
  };
}

function mapGrant(raw: RawResourceAccessGrant): ResourceAccessGrant {
  return {
    id: raw.id,
    person_id: raw.person_id,
    resource_id: raw.resource_id,
    valid_from: parseNullableDate(raw.valid_from),
    valid_until: parseNullableDate(raw.valid_until),
  };
}

function mapDelegate(raw: RawResourceAccessDelegate): ResourceAccessDelegate {
  return {
    id: raw.id,
    resource_id: raw.resource_id,
    delegate_type: raw.delegate_type,
    delegate_person_id: raw.delegate_person_id,
    delegate_org_id: raw.delegate_org_id,
    granted_by_org_id: raw.granted_by_org_id,
    valid_from: parseNullableDate(raw.valid_from),
    valid_until: parseNullableDate(raw.valid_until),
  };
}

function orgLinksFor(
  raw: DigitalResourceWorldResponse,
  resourceId: string,
  tier: "NETWORK" | "PLATFORM" | "APPLICATION",
): OrgLink[] {
  return raw.org_links
    .filter((l) => l.resource_id === resourceId && l.resource_tier === tier)
    .map(mapOrgLink);
}

function policyAssignmentsFor(
  raw: DigitalResourceWorldResponse,
  resourceId: string,
  tier: "NETWORK" | "PLATFORM" | "APPLICATION",
): PolicyAssignment[] {
  return raw.policy_assignments
    .filter((a) => a.resource_id === resourceId && a.resource_tier === tier)
    .map((a) => mapPolicyAssignment(a, raw.policies));
}

// --- Top-level mapper ---

export function mapWorldResponse(
  raw: DigitalResourceWorldResponse,
): DigitalResourceWorld {
  const networks: NetworkNode[] = raw.networks.map((n) => ({
    id: n.id,
    name: n.name,
    tier: "NETWORK",
    classification: n.classification as Clearance,
    org_links: orgLinksFor(raw, n.id, "NETWORK"),
    policy_assignments: policyAssignmentsFor(raw, n.id, "NETWORK"),
  }));

  const platforms: PlatformNode[] = raw.platforms.map((p) => ({
    id: p.id,
    name: p.name,
    tier: "PLATFORM",
    classification: p.classification as Clearance,
    network_id: p.network_id,
    org_links: orgLinksFor(raw, p.id, "PLATFORM"),
    policy_assignments: policyAssignmentsFor(raw, p.id, "PLATFORM"),
  }));

  const applications: ApplicationNode[] = raw.applications.map((a) => ({
    id: a.id,
    name: a.name,
    tier: "APPLICATION",
    platform_id: a.platform_id,
    org_links: orgLinksFor(raw, a.id, "APPLICATION"),
    policy_assignments: policyAssignmentsFor(raw, a.id, "APPLICATION"),
  }));

  return {
    networks,
    platforms,
    applications,
    orgLinks: raw.org_links.map(mapOrgLink),
    policies: raw.policies.map(mapPolicy),
    policyAssignments: raw.policy_assignments.map((a) =>
      mapPolicyAssignment(a, raw.policies),
    ),
    grants: raw.grants.map(mapGrant),
    delegates: raw.delegates.map(mapDelegate),
    // Client-only state, never sent by the server — always empty on a fresh
    // load. The reducer's SET_DIGITAL_RESOURCES case (Task 2) preserves the
    // prior value across a refetch instead of overwriting it with this.
    disabledResourceGrantIds: new Set(),
  };
}
