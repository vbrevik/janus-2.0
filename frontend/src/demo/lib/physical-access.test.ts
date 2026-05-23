// demo/lib/physical-access.test.ts — Vitest unit tests for Phase 5 zone access rules.
// Covers: CLEARANCE_RANK ranks, isValidZoneTypeCombination, evaluateControlledAccess,
//         evaluateRestrictedAccess, evaluateSecuredAccess, getAncestors, getDescendants.

import { describe, it, expect } from "vitest";
import {
  CLEARANCE_RANK,
  isValidZoneTypeCombination,
  evaluateControlledAccess,
  evaluateRestrictedAccess,
  evaluateSecuredAccess,
  getAncestors,
  getDescendants,
  type ZoneNode,
} from "./model";

// Inline fixtures — no seed.ts imports (D3-13 pattern).

describe("CLEARANCE_RANK — 5-tier ladder", () => {
  it("RESTRICTED is rank 1", () => {
    expect(CLEARANCE_RANK["RESTRICTED"]).toBe(1);
  });
  it("CONFIDENTIAL is rank 2 after inserting RESTRICTED", () => {
    expect(CLEARANCE_RANK["CONFIDENTIAL"]).toBe(2);
  });
});

describe("isValidZoneTypeCombination", () => {
  it("returns false for SITE + SECURED (ZONE-03 ceiling rule)", () => {
    expect(isValidZoneTypeCombination("SITE", "SECURED")).toBe(false);
  });
  it("returns false for AREA + SECURED (ZONE-03 ceiling rule)", () => {
    expect(isValidZoneTypeCombination("AREA", "SECURED")).toBe(false);
  });
  it("returns true for BUILDING + SECURED (SECURED valid at building level)", () => {
    expect(isValidZoneTypeCombination("BUILDING", "SECURED")).toBe(true);
  });
  it("returns true for SITE + CONTROLLED (non-SECURED always valid)", () => {
    expect(isValidZoneTypeCombination("SITE", "CONTROLLED")).toBe(true);
  });
});

describe("evaluateControlledAccess", () => {
  it("ALLOW when hasGrant is true", () => {
    const r = evaluateControlledAccess(true);
    expect(r.allow).toBe(true);
    expect(r.reason).toBe("GRANT_FOUND");
    expect(r.gate).toBe("ZONE_TYPE_RULE");
  });
  it("DENY when hasGrant is false", () => {
    const r = evaluateControlledAccess(false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("NO_GRANT");
    expect(r.gate).toBe("ZONE_TYPE_RULE");
  });
});

describe("evaluateRestrictedAccess", () => {
  it("DENY when no grant regardless of clearance (NO_GRANT early return)", () => {
    // Branch 1: (false, "RESTRICTED", false) → DENY NO_GRANT
    const r = evaluateRestrictedAccess(false, "RESTRICTED", false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("NO_GRANT");
  });
  it("ALLOW when has grant and sufficient clearance (RESTRICTED clearance meets threshold)", () => {
    // Branch 2: (true, "RESTRICTED", false) → ALLOW GRANT_FOUND
    const r = evaluateRestrictedAccess(true, "RESTRICTED", false);
    expect(r.allow).toBe(true);
    expect(r.reason).toBe("GRANT_FOUND");
  });
  it("ALLOW when has grant and valid escort even if clearance is below threshold (escort alternate path)", () => {
    // Branch 3: (true, "UNCLASSIFIED", true) → ALLOW GRANT_FOUND (escort unlocks RESTRICTED)
    const r = evaluateRestrictedAccess(true, "UNCLASSIFIED", true);
    expect(r.allow).toBe(true);
    expect(r.reason).toBe("GRANT_FOUND");
  });
  it("DENY when has grant but insufficient clearance and no escort", () => {
    // Branch 4: (true, "UNCLASSIFIED", false) → DENY INSUFFICIENT_CLEARANCE
    const r = evaluateRestrictedAccess(true, "UNCLASSIFIED", false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("INSUFFICIENT_CLEARANCE");
  });
});

describe("evaluateSecuredAccess", () => {
  it("DENY when no grant (NO_GRANT early return)", () => {
    // Branch 1: (false, "TOP_SECRET", false) → DENY NO_GRANT
    const r = evaluateSecuredAccess(false, "TOP_SECRET", false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("NO_GRANT");
  });
  it("ALLOW when has grant and SECRET clearance — detail contains 'entry log mandatory'", () => {
    // Branch 2: (true, "SECRET", false) → ALLOW GRANT_FOUND with entry log detail
    const r = evaluateSecuredAccess(true, "SECRET", false);
    expect(r.allow).toBe(true);
    expect(r.reason).toBe("GRANT_FOUND");
    expect(r.detail).toContain("entry log mandatory");
  });
  it("DENY when has grant but CONFIDENTIAL clearance (below SECRET threshold)", () => {
    // Branch 3: (true, "CONFIDENTIAL", false) → DENY INSUFFICIENT_CLEARANCE
    const r = evaluateSecuredAccess(true, "CONFIDENTIAL", false);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("INSUFFICIENT_CLEARANCE");
  });
  it("DENY when has grant and escort but CONFIDENTIAL clearance — escort does NOT unlock SECURED (T-05-01)", () => {
    // Branch 4: (true, "CONFIDENTIAL", true) → DENY INSUFFICIENT_CLEARANCE
    // Proves escort cannot substitute for clearance in SECURED zones (D-03, T-05-01).
    const r = evaluateSecuredAccess(true, "CONFIDENTIAL", true);
    expect(r.allow).toBe(false);
    expect(r.reason).toBe("INSUFFICIENT_CLEARANCE");
  });
});

// Inline zone tree fixture for tree traversal tests.
// Structure:
//   site (SITE, CONTROLLED, parent_id: null)
//   ├── building1 (BUILDING, SECURED, parent_id: "z-site")
//   │   └── room1 (ROOM, SECURED, parent_id: "z-bldg1")
//   └── building2 (BUILDING, RESTRICTED, parent_id: "z-site")  ← sibling of building1

const Z_SITE: ZoneNode = {
  id: "z-site",
  name: "Main Campus",
  level: "SITE",
  zone_type: "CONTROLLED",
  parent_id: null,
  admin_org_id: "org-a",
  asset_owner_org_id: "org-a",
  requires_explicit_auth: false,
};

const Z_BUILDING1: ZoneNode = {
  id: "z-bldg1",
  name: "Classified Research Wing",
  level: "BUILDING",
  zone_type: "SECURED",
  parent_id: "z-site",
  admin_org_id: "org-intel",
  asset_owner_org_id: "org-intel",
  requires_explicit_auth: true,
};

const Z_ROOM1: ZoneNode = {
  id: "z-room1",
  name: "Vault 1",
  level: "ROOM",
  zone_type: "SECURED",
  parent_id: "z-bldg1",
  admin_org_id: "org-intel",
  asset_owner_org_id: "org-intel",
  requires_explicit_auth: true,
};

const Z_BUILDING2: ZoneNode = {
  id: "z-bldg2",
  name: "Restricted Operations Wing",
  level: "BUILDING",
  zone_type: "RESTRICTED",
  parent_id: "z-site",
  admin_org_id: "org-a",
  asset_owner_org_id: "org-b",
  requires_explicit_auth: false,
};

const ALL_ZONES: ZoneNode[] = [Z_SITE, Z_BUILDING1, Z_ROOM1, Z_BUILDING2];

describe("getAncestors", () => {
  it("returns ancestors of room in parent-first order: [building1, site]", () => {
    const ancestors = getAncestors("z-room1", ALL_ZONES);
    expect(ancestors).toHaveLength(2);
    // parent-first: element [0] is the room's direct parent (building1)
    expect(ancestors[0].id).toBe("z-bldg1");
    // last element is root site
    expect(ancestors[ancestors.length - 1].id).toBe("z-site");
  });
  it("returns empty array for root site (no ancestors)", () => {
    const ancestors = getAncestors("z-site", ALL_ZONES);
    expect(ancestors).toHaveLength(0);
  });
});

describe("getDescendants", () => {
  it("returns all transitive descendants of site: building1, room1, building2", () => {
    const descendants = getDescendants("z-site", ALL_ZONES);
    const ids = descendants.map((z) => z.id);
    // All 3 non-root nodes must be present (transitive)
    expect(ids).toContain("z-bldg1");
    expect(ids).toContain("z-room1");
    expect(ids).toContain("z-bldg2");
    expect(descendants).toHaveLength(3);
  });
  it("returns empty array for leaf room (no descendants)", () => {
    const descendants = getDescendants("z-room1", ALL_ZONES);
    expect(descendants).toHaveLength(0);
  });
});
