// demo/lib/digital-resource-selectors.test.ts — Vitest unit tests for
// resolveResourceAt's zone-advisory wiring (RSRC-UI-05 regression, gap
// closure for 12-UAT.md test 10).
//
// Conventions (mirrors digital-resource-mapper.test.ts): inline fixtures
// only, no seed.ts import.
//
// Prior to this fix, resolveResourceAt hardcoded [] for both allZones and
// allPhysicalGrants when calling resolveResourceAccess, so zoneAdvisory was
// permanently null regardless of seed data. These tests target
// resolveResourceAt itself (not the already-tested underlying
// resolveResourceAccess in model.ts), so a future revert of this wiring
// fails a fast unit test instead of only being catchable by manual UAT.

import { describe, it, expect } from "vitest";
import { resolveResourceAt } from "./digital-resource-selectors";
import type {
  DigitalResourceWorld,
  NetworkNode,
  ZoneNode,
  PhysicalAccessGrant,
} from "./model";

const NOW = new Date("2026-02-15T12:00:00Z");

function makeZone(id: string): ZoneNode {
  return {
    id,
    name: "Server Room 1",
    level: "ROOM",
    zone_type: "SECURED",
    parent_id: null,
    admin_org_id: "MILITARY_1",
    asset_owner_org_id: "MILITARY_1",
    requires_explicit_auth: true,
  };
}

function makeNetwork(zonePrereqId: string | null): NetworkNode {
  return {
    id: "net-test",
    name: "TestNet",
    tier: "NETWORK",
    classification: "SECRET",
    org_links: [],
    policy_assignments: [
      {
        policy: {
          id: "policy-test",
          label: "Test Policy",
          gates: [{ kind: "CLEARANCE" }],
          zone_prereq_id: zonePrereqId,
        },
        valid_from: null,
        valid_until: null,
      },
    ],
  };
}

function buildWorld(network: NetworkNode): DigitalResourceWorld {
  return {
    networks: [network],
    platforms: [],
    applications: [],
    orgLinks: [],
    policies: [],
    policyAssignments: [],
    grants: [],
    delegates: [],
    disabledResourceGrantIds: new Set<string>(),
  };
}

describe("resolveResourceAt — zone advisory wiring (RSRC-UI-05 regression)", () => {
  it("resolves a non-null zoneAdvisory when the policy's zone_prereq_id matches a real zone in allZones", () => {
    const zone = makeZone("zone-test-1");
    const network = makeNetwork(zone.id);
    const world = buildWorld(network);
    const allZones: ZoneNode[] = [zone];
    const allPhysicalGrants: PhysicalAccessGrant[] = [];

    const result = resolveResourceAt(
      world,
      "subj-1",
      "SECRET",
      "MILITARY_1",
      network.id,
      allZones,
      allPhysicalGrants,
      NOW,
    );

    expect(result.zoneAdvisory).not.toBeNull();
  });

  it("returns zoneAdvisory: null when the policy's zone_prereq_id has no matching entry in allZones", () => {
    const network = makeNetwork("zone-does-not-exist");
    const world = buildWorld(network);
    const allZones: ZoneNode[] = []; // no matching zone
    const allPhysicalGrants: PhysicalAccessGrant[] = [];

    const result = resolveResourceAt(
      world,
      "subj-1",
      "SECRET",
      "MILITARY_1",
      network.id,
      allZones,
      allPhysicalGrants,
      NOW,
    );

    expect(result.zoneAdvisory).toBeNull();
  });

  it("returns zoneAdvisory: null when the policy has zone_prereq_id: null, regardless of allZones content", () => {
    const zone = makeZone("zone-test-1");
    const network = makeNetwork(null);
    const world = buildWorld(network);
    const allZones: ZoneNode[] = [zone];
    const allPhysicalGrants: PhysicalAccessGrant[] = [];

    const result = resolveResourceAt(
      world,
      "subj-1",
      "SECRET",
      "MILITARY_1",
      network.id,
      allZones,
      allPhysicalGrants,
      NOW,
    );

    expect(result.zoneAdvisory).toBeNull();
  });
});
