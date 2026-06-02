// demo/lib/digital-resource.test.ts — Vitest unit tests for the Phase 9 (v2.2)
// digital-resource model + policy engine. Sibling of physical-access.test.ts.
//
// One blocking test per Phase 9 acceptance criterion. The five EXACTLY-NAMED
// pitfall tests are the executable mitigations for this phase's authorization
// threats (the verifier greps for them):
//   - cross-tier-inheritance-blocked  (req 7 / T-09-11): Network grant never
//     satisfies a Platform own-tier gate.
//   - advisory-non-blocking           (req 8 / T-09-12): failing zone prereq
//     leaves allow:true with a non-null, denying zoneAdvisory.
//   - unknown-gate-kind-errors        (req 5 / T-09-13): injected unknown kind
//     fails closed (UNKNOWN_GATE_KIND), never a silent ALLOW.
//   - no-active-policy-denies         (req 4 / T-09-13): uncovered timestamp =>
//     NO_ACTIVE_POLICY DENY, empty gates, null policyVersion.
//   - app-classification-inherited    (req 2 / T-09-14): the host Platform's
//     classification drives the App clearance gate; App carries no classification.
//
// Coverage (Task 2): baseline-allow + per-gate baseline-deny, gate list order,
// policy-shift windows (SEED-06 boundary 2026-03-01 per D-04), overlapping-window
// validator, active-org-links-by-role, canIssueResourceGrant delegation matrix,
// explainable trace.
//
// Conventions (mirrors physical-access.test.ts): inline fixtures only (NO seed.ts
// import — "D3-13 pattern"); a single fixed NOW plus the SEED-06 window constants
// NOW_A (window A -> ALLOW) and NOW_B (window B -> DENY). All engine functions are
// pure and take an explicit now: Date.

import { describe, it, expect } from "vitest";
import {
  resolveResourceAccess,
  canIssueResourceGrant,
  effectiveClassification,
  selectActivePolicy,
  validatePolicyWindows,
  activeOrgLinks,
  activeOrgLinksForRole,
  isWindowActive,
  evaluateGate,
  type NetworkNode,
  type PlatformNode,
  type ApplicationNode,
  type OrgLink,
  type GateDescriptor,
  type ResourcePolicy,
  type PolicyAssignment,
  type ResourceAccessGrant,
  type ResourceAccessDelegate,
  type ZoneNode,
  type PhysicalAccessGrant,
} from "./model";

// --- Shared fixed clock ---
// Plain NOW for the inline unit fixtures (mirrors physical-access.test.ts line 214).
const NOW = new Date("2026-02-15T12:00:00Z");

// SEED-06 policy-shift boundary is 2026-03-01 (D-04). NOW_A is inside window A
// (baseline -> ALLOW); NOW_B is inside window B (baseline + SECURITY_APPROVAL -> DENY).
// Do NOT use 2026-06-01.
const NOW_A = new Date("2026-02-15T00:00:00Z");
const NOW_B = new Date("2026-04-15T00:00:00Z");
const SHIFT_BOUNDARY = new Date("2026-03-01T00:00:00Z");

// Baseline gate list reused across fixtures: clearance, own-tier grant, parent grant.
const BASELINE_GATES: GateDescriptor[] = [
  { kind: "CLEARANCE" },
  { kind: "OWN_TIER_GRANT" },
  { kind: "PARENT_TIER_GRANT" },
];

const BASELINE_POLICY: ResourcePolicy = {
  id: "pol-baseline",
  label: "Baseline",
  gates: BASELINE_GATES,
  zone_prereq_id: null,
};

// A permanent assignment covering NOW for the baseline policy.
const ALWAYS_ON: PolicyAssignment = {
  policy: BASELINE_POLICY,
  valid_from: null,
  valid_until: null,
};

// =====================================================================
// Named pitfall blocking tests (Task 1) — the threat mitigations.
// =====================================================================

describe("named pitfall blocking tests", () => {
  it("cross-tier-inheritance-blocked", () => {
    // req 7 / T-09-11: a person holding ONLY a Network grant is evaluated for
    // Platform access. The Network grant must NOT satisfy the Platform's
    // OWN_TIER_GRANT gate (no ancestor walk). PARENT_TIER_GRANT is satisfied
    // (the network grant IS the platform's parent grant), isolating OWN_TIER.
    const network: NetworkNode = {
      id: "net-1",
      name: "Net 1",
      tier: "NETWORK",
      classification: "UNCLASSIFIED",
      org_links: [],
      policy_assignments: [ALWAYS_ON],
    };
    const platform: PlatformNode = {
      id: "plat-1",
      name: "Platform 1",
      tier: "PLATFORM",
      classification: "UNCLASSIFIED",
      network_id: "net-1",
      org_links: [],
      policy_assignments: [ALWAYS_ON],
    };
    // Subject holds a grant on the NETWORK only — none on the Platform.
    const networkGrant: ResourceAccessGrant = {
      id: "g-net",
      person_id: "subj-1",
      resource_id: "net-1",
      valid_from: null,
      valid_until: null,
    };

    const result = resolveResourceAccess(
      "subj-1",
      "TOP_SECRET", // clearance is ample — only the grant tier is the issue
      "MILITARY_1",
      platform,
      [network],
      [platform],
      [networkGrant],
      [],
      [],
      NOW,
    );

    expect(result.allow).toBe(false);
    const ownTier = result.gates.find((g) => g.kind === "OWN_TIER_GRANT");
    expect(ownTier).toBeDefined();
    expect(ownTier?.pass).toBe(false);
    // The parent gate IS satisfied by the network grant — proving the own-tier
    // denial is specifically the cross-tier block, not a missing parent.
    const parentTier = result.gates.find((g) => g.kind === "PARENT_TIER_GRANT");
    expect(parentTier?.pass).toBe(true);
  });

  it("advisory-non-blocking", () => {
    // req 8 / T-09-12: all access gates PASS but the policy's zone prerequisite
    // is unsatisfiable. allow must stay true; zoneAdvisory non-null and denying.
    const securedZone: ZoneNode = {
      id: "z-vault",
      name: "Vault",
      level: "ROOM",
      zone_type: "SECURED",
      parent_id: null,
      admin_org_id: "INTEL",
      asset_owner_org_id: "INTEL",
      requires_explicit_auth: true,
    };
    const advisoryPolicy: ResourcePolicy = {
      id: "pol-advisory",
      label: "Baseline + zone advisory",
      gates: BASELINE_GATES,
      zone_prereq_id: "z-vault",
    };
    const network: NetworkNode = {
      id: "net-adv",
      name: "Net Adv",
      tier: "NETWORK",
      classification: "UNCLASSIFIED",
      org_links: [],
      policy_assignments: [
        { policy: advisoryPolicy, valid_from: null, valid_until: null },
      ],
    };
    // Subject has the own-tier grant; Network has no parent so PARENT passes.
    const ownGrant: ResourceAccessGrant = {
      id: "g-own-adv",
      person_id: "subj-1",
      resource_id: "net-adv",
      valid_from: null,
      valid_until: null,
    };
    // No PhysicalAccessGrant for the zone => resolveZoneAccess denies (NO_GRANT).

    const result = resolveResourceAccess(
      "subj-1",
      "TOP_SECRET",
      "MILITARY_1",
      network,
      [network],
      [],
      [ownGrant],
      [securedZone],
      [], // no physical grants -> zone denied
      NOW,
    );

    expect(result.allow).toBe(true); // all access gates passed
    expect(result.zoneAdvisory).not.toBeNull();
    expect(result.zoneAdvisory?.allow).toBe(false); // zone prereq unsatisfied
  });

  it("unknown-gate-kind-errors", () => {
    // req 5 / T-09-13: an injected synthetic gate kind must fail closed.
    const unknownGate = { kind: "NONEXISTENT_GATE" } as GateDescriptor;
    const policy: ResourcePolicy = {
      id: "pol-unknown",
      label: "Has unknown gate",
      gates: [{ kind: "CLEARANCE" }, unknownGate],
      zone_prereq_id: null,
    };
    const network: NetworkNode = {
      id: "net-unk",
      name: "Net Unk",
      tier: "NETWORK",
      classification: "UNCLASSIFIED",
      org_links: [],
      policy_assignments: [{ policy, valid_from: null, valid_until: null }],
    };

    const result = resolveResourceAccess(
      "subj-1",
      "TOP_SECRET",
      "MILITARY_1",
      network,
      [network],
      [],
      [],
      [],
      [],
      NOW,
    );

    const unknownEntry = result.gates.find(
      (g) => g.kind === "NONEXISTENT_GATE",
    );
    expect(unknownEntry).toBeDefined();
    expect(unknownEntry?.pass).toBe(false); // never a silent ALLOW
    expect(unknownEntry?.reason).toBe("UNKNOWN_GATE_KIND");
    expect(result.allow).toBe(false);
  });

  it("no-active-policy-denies", () => {
    // req 4 / D-03 / T-09-13: a resource whose assignments do not cover NOW.
    const network: NetworkNode = {
      id: "net-nopol",
      name: "Net NoPol",
      tier: "NETWORK",
      classification: "UNCLASSIFIED",
      org_links: [],
      policy_assignments: [
        {
          policy: BASELINE_POLICY,
          // Window entirely in the past relative to NOW (2026-02-15).
          valid_from: new Date("2025-01-01T00:00:00Z"),
          valid_until: new Date("2025-12-31T23:59:59Z"),
        },
      ],
    };

    const result = resolveResourceAccess(
      "subj-1",
      "TOP_SECRET",
      "MILITARY_1",
      network,
      [network],
      [],
      [],
      [],
      [],
      NOW,
    );

    expect(result.allow).toBe(false);
    expect(result.reason).toBe("NO_ACTIVE_POLICY");
    expect(result.policyVersion).toBeNull();
    expect(result.gates).toHaveLength(0);
  });

  it("app-classification-inherited", () => {
    // req 2 / T-09-14: a SECRET Platform hosts an Application that carries NO
    // classification. A subject below SECRET fails the CLEARANCE gate using the
    // PLATFORM's classification (the App has none of its own).
    const platform: PlatformNode = {
      id: "plat-secret",
      name: "Secret Platform",
      tier: "PLATFORM",
      classification: "SECRET",
      network_id: "net-x",
      org_links: [],
      policy_assignments: [ALWAYS_ON],
    };
    const app: ApplicationNode = {
      id: "app-1",
      name: "App 1",
      tier: "APPLICATION",
      platform_id: "plat-secret",
      org_links: [],
      policy_assignments: [ALWAYS_ON],
    };
    // Grants so OWN_TIER (app) and PARENT_TIER (platform) both pass — isolating
    // the CLEARANCE gate as the sole denial driver.
    const grants: ResourceAccessGrant[] = [
      {
        id: "g-app",
        person_id: "subj-1",
        resource_id: "app-1",
        valid_from: null,
        valid_until: null,
      },
      {
        id: "g-plat",
        person_id: "subj-1",
        resource_id: "plat-secret",
        valid_from: null,
        valid_until: null,
      },
    ];

    // Runtime proof the App fixture carries no classification field (RSRC-02).
    expect("classification" in app).toBe(false);
    // The derived effective classification comes from the host Platform.
    expect(effectiveClassification(app, [platform])).toBe("SECRET");

    const result = resolveResourceAccess(
      "subj-1",
      "CONFIDENTIAL", // below SECRET
      "MILITARY_1",
      app,
      [],
      [platform],
      grants,
      [],
      [],
      NOW,
    );

    expect(result.allow).toBe(false);
    const clearance = result.gates.find((g) => g.kind === "CLEARANCE");
    expect(clearance?.pass).toBe(false);
    expect(clearance?.reason).toBe("INSUFFICIENT_CLEARANCE");
    // The non-clearance gates passed — confirming the only failure is the
    // Platform-derived clearance requirement.
    const ownTier = result.gates.find((g) => g.kind === "OWN_TIER_GRANT");
    const parentTier = result.gates.find((g) => g.kind === "PARENT_TIER_GRANT");
    expect(ownTier?.pass).toBe(true);
    expect(parentTier?.pass).toBe(true);
  });
});
