// demo/lib/digital-resource-mapper.test.ts — Vitest unit tests for
// mapWorldResponse (raw backend /world response -> DigitalResourceWorld).
//
// Conventions (mirrors digital-resource.test.ts): inline fixtures only, no
// seed.ts import. Each test builds a minimal DigitalResourceWorldResponse
// fixture covering exactly one behavior from the plan's acceptance criteria.

import { describe, it, expect } from "vitest";
import {
  mapWorldResponse,
  parseNullableDate,
  mapOrgLink,
  type DigitalResourceWorldResponse,
  type RawResourceNetwork,
  type RawResourcePlatform,
  type RawResourceApplication,
  type RawOrgLink,
  type RawResourcePolicy,
  type RawPolicyAssignment,
  type RawResourceAccessGrant,
  type RawResourceAccessDelegate,
} from "./digital-resource-mapper";

function baseFixture(): DigitalResourceWorldResponse {
  return {
    networks: [],
    platforms: [],
    applications: [],
    org_links: [],
    policies: [],
    policy_assignments: [],
    grants: [],
    delegates: [],
  };
}

const NETWORK: RawResourceNetwork = {
  id: "net-1",
  name: "MilNet",
  classification: "SECRET",
  created_at: null,
  updated_at: null,
};

const PLATFORM: RawResourcePlatform = {
  id: "plat-1",
  name: "MilNet Platform",
  classification: "SECRET",
  network_id: "net-1",
  created_at: null,
  updated_at: null,
};

const APPLICATION: RawResourceApplication = {
  id: "app-1",
  name: "MilNet App",
  platform_id: "plat-1",
  created_at: null,
  updated_at: null,
};

describe("mapWorldResponse", () => {
  it("denormalizes org_links onto the matching node by resource_id + resource_tier", () => {
    const matching: RawOrgLink = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      org_id: "MILITARY_1",
      role: "ADMIN",
      valid_from: null,
      valid_until: null,
    };
    const otherTier: RawOrgLink = {
      id: 2,
      resource_id: "net-1", // same resource_id, different tier — must NOT match
      resource_tier: "PLATFORM",
      org_id: "MILITARY_2",
      role: "OPERATOR",
      valid_from: null,
      valid_until: null,
    };
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      networks: [NETWORK],
      org_links: [matching, otherTier],
    };

    const world = mapWorldResponse(raw);

    expect(world.networks).toHaveLength(1);
    expect(world.networks[0].org_links).toHaveLength(1);
    expect(world.networks[0].org_links[0].org_id).toBe("MILITARY_1");
  });

  it("resolves policy_id to the full ResourcePolicy object, not a bare string", () => {
    const policy: RawResourcePolicy = {
      id: "pol-a",
      label: "Baseline",
      gates: [{ kind: "CLEARANCE" }],
      zone_prereq_id: null,
    };
    const assignment: RawPolicyAssignment = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      policy_id: "pol-a",
      valid_from: null,
      valid_until: null,
    };
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      networks: [NETWORK],
      policies: [policy],
      policy_assignments: [assignment],
    };

    const world = mapWorldResponse(raw);

    expect(world.networks[0].policy_assignments).toHaveLength(1);
    const resolved = world.networks[0].policy_assignments[0].policy;
    expect(resolved).toEqual({
      id: "pol-a",
      label: "Baseline",
      gates: [{ kind: "CLEARANCE" }],
      zone_prereq_id: null,
    });
  });

  it("throws when a policy_assignments row references an unknown policy_id", () => {
    const assignment: RawPolicyAssignment = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      policy_id: "missing-policy",
      valid_from: null,
      valid_until: null,
    };
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      networks: [NETWORK],
      policies: [], // policy absent
      policy_assignments: [assignment],
    };

    expect(() => mapWorldResponse(raw)).toThrow();
  });

  it("parses valid_from/valid_until ISO strings into Date | null", () => {
    const link: RawOrgLink = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      org_id: "MILITARY_1",
      role: "ADMIN",
      valid_from: "2026-03-01T00:00:00Z",
      valid_until: null,
    };
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      networks: [NETWORK],
      org_links: [link],
    };

    const world = mapWorldResponse(raw);
    const mapped = world.networks[0].org_links[0];

    expect(mapped.valid_from).toBeInstanceOf(Date);
    expect(mapped.valid_from?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(mapped.valid_until).toBeNull();
  });

  it("returns disabledResourceGrantIds as an empty Set on every call", () => {
    const raw = baseFixture();
    const world = mapWorldResponse(raw);
    expect(world.disabledResourceGrantIds).toBeInstanceOf(Set);
    expect(world.disabledResourceGrantIds.size).toBe(0);
  });

  it("assigns platform/application tiers correctly and omits classification on applications", () => {
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      networks: [NETWORK],
      platforms: [PLATFORM],
      applications: [APPLICATION],
    };

    const world = mapWorldResponse(raw);

    expect(world.platforms[0].tier).toBe("PLATFORM");
    expect(world.platforms[0].classification).toBe("SECRET");
    expect(world.applications[0].tier).toBe("APPLICATION");
    expect("classification" in world.applications[0]).toBe(false);
  });

  it("maps grants and delegates with parsed dates", () => {
    const grant: RawResourceAccessGrant = {
      id: "grant-1",
      person_id: "person-1",
      resource_id: "net-1",
      valid_from: "2026-01-01T00:00:00Z",
      valid_until: null,
    };
    const delegate: RawResourceAccessDelegate = {
      id: "delegate-1",
      resource_id: "net-1",
      delegate_type: "PERSON",
      delegate_person_id: "person-2",
      delegate_org_id: null,
      granted_by_org_id: "MILITARY_1",
      valid_from: null,
      valid_until: null,
    };
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      grants: [grant],
      delegates: [delegate],
    };

    const world = mapWorldResponse(raw);

    expect(world.grants).toHaveLength(1);
    expect(world.grants[0].valid_from).toBeInstanceOf(Date);
    expect(world.delegates).toHaveLength(1);
    expect(world.delegates[0].delegate_person_id).toBe("person-2");
  });

  it("populates flat top-level orgLinks/policyAssignments mirrors", () => {
    const link: RawOrgLink = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      org_id: "MILITARY_1",
      role: "ADMIN",
      valid_from: null,
      valid_until: null,
    };
    const policy: RawResourcePolicy = {
      id: "pol-a",
      label: "Baseline",
      gates: [],
      zone_prereq_id: null,
    };
    const assignment: RawPolicyAssignment = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      policy_id: "pol-a",
      valid_from: null,
      valid_until: null,
    };
    const raw: DigitalResourceWorldResponse = {
      ...baseFixture(),
      networks: [NETWORK],
      org_links: [link],
      policies: [policy],
      policy_assignments: [assignment],
    };

    const world = mapWorldResponse(raw);

    expect(world.orgLinks).toHaveLength(1);
    expect(world.policyAssignments).toHaveLength(1);
    expect(world.policies).toHaveLength(1);
  });
});

describe("parseNullableDate", () => {
  it("returns null for null input", () => {
    expect(parseNullableDate(null)).toBeNull();
  });

  it("returns a Date instance for an ISO string", () => {
    const result = parseNullableDate("2026-03-01T00:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("mapOrgLink", () => {
  it("drops id/resource_id/resource_tier and parses dates", () => {
    const raw: RawOrgLink = {
      id: 1,
      resource_id: "net-1",
      resource_tier: "NETWORK",
      org_id: "MILITARY_1",
      role: "ADMIN",
      valid_from: null,
      valid_until: null,
    };
    const mapped = mapOrgLink(raw);
    expect(mapped).toEqual({
      org_id: "MILITARY_1",
      role: "ADMIN",
      valid_from: null,
      valid_until: null,
    });
  });
});
