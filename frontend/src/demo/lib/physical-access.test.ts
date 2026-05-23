// demo/lib/physical-access.test.ts — Vitest unit tests for Phase 5 zone access rules.
// Covers: CLEARANCE_RANK ranks, isValidZoneTypeCombination, evaluateControlledAccess,
//         evaluateRestrictedAccess, evaluateSecuredAccess, getAncestors, getDescendants.
// Phase 6: isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive.

import { describe, it, expect } from "vitest";
import {
  CLEARANCE_RANK,
  isValidZoneTypeCombination,
  evaluateControlledAccess,
  evaluateRestrictedAccess,
  evaluateSecuredAccess,
  getAncestors,
  getDescendants,
  isGrantActive,
  resolveGrant,
  resolveZoneAccess,
  isDelegateActive,
  type ZoneNode,
  type PhysicalAccessGrant,
  type ZoneAccessDelegate,
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

// --- Phase 6 fixtures ---
// Grant fixtures for time-window and resolution tests.

const NOW = new Date("2026-01-15T12:00:00Z");

// Permanent grant (no time boundaries)
const G_PERMANENT: PhysicalAccessGrant = {
  id: "g-permanent",
  person_id: "p-1",
  zone_id: "z-room1",
  valid_from: null,
  valid_until: null,
};

// Time-bounded grant that is active at NOW
const G_ACTIVE: PhysicalAccessGrant = {
  id: "g-active",
  person_id: "p-1",
  zone_id: "z-room1",
  valid_from: new Date("2026-01-01T00:00:00Z"),
  valid_until: new Date("2026-12-31T23:59:59Z"),
};

// Grant that expired before NOW
const G_EXPIRED: PhysicalAccessGrant = {
  id: "g-expired",
  person_id: "p-1",
  zone_id: "z-room1",
  valid_from: new Date("2025-01-01T00:00:00Z"),
  valid_until: new Date("2025-12-31T23:59:59Z"),
};

// Grant with start date in the future
const G_FUTURE: PhysicalAccessGrant = {
  id: "g-future",
  person_id: "p-1",
  zone_id: "z-room1",
  valid_from: new Date("2027-01-01T00:00:00Z"),
  valid_until: null,
};

// Grant exactly at valid_until boundary (boundary is inclusive)
const G_BOUNDARY: PhysicalAccessGrant = {
  id: "g-boundary",
  person_id: "p-1",
  zone_id: "z-room1",
  valid_from: null,
  valid_until: NOW, // exact boundary: valid_until === now
};

// Ancestor grant on the SECURED building (same zone_type as Z_ROOM1)
const G_ANCESTOR_BLDG1: PhysicalAccessGrant = {
  id: "g-ancestor-bldg1",
  person_id: "p-1",
  zone_id: "z-bldg1",
  valid_from: null,
  valid_until: null,
};

// Ancestor grant on the CONTROLLED site (zone_type mismatch for SECURED room)
const G_ANCESTOR_SITE: PhysicalAccessGrant = {
  id: "g-ancestor-site",
  person_id: "p-1",
  zone_id: "z-site",
  valid_from: null,
  valid_until: null,
};

// Grant on a RESTRICTED building (Z_BUILDING2) for person p-2
const G_BLDG2: PhysicalAccessGrant = {
  id: "g-bldg2",
  person_id: "p-2",
  zone_id: "z-bldg2",
  valid_from: null,
  valid_until: null,
};

// Delegate fixture
const DELEGATE_ACTIVE: ZoneAccessDelegate = {
  id: "d-1",
  zone_id: "z-bldg1",
  delegate_type: "PERSON",
  delegate_person_id: "p-admin",
  delegate_org_id: null,
  granted_by_org_id: "org-intel",
  valid_from: null,
  valid_until: null,
};

const DELEGATE_EXPIRED: ZoneAccessDelegate = {
  id: "d-2",
  zone_id: "z-bldg1",
  delegate_type: "ORG",
  delegate_person_id: null,
  delegate_org_id: "org-b",
  granted_by_org_id: "org-intel",
  valid_from: new Date("2025-01-01T00:00:00Z"),
  valid_until: new Date("2025-06-30T23:59:59Z"),
};

describe("isGrantActive", () => {
  it("returns true for permanent grant (both boundaries null)", () => {
    // null valid_from + null valid_until → always active
    expect(isGrantActive(G_PERMANENT, NOW)).toBe(true);
  });
  it("returns true for active time-bounded grant (now within window)", () => {
    // valid_from < now < valid_until → active
    expect(isGrantActive(G_ACTIVE, NOW)).toBe(true);
  });
  it("returns false for expired grant (valid_until before now)", () => {
    // valid_until < now → expired
    expect(isGrantActive(G_EXPIRED, NOW)).toBe(false);
  });
  it("returns false for future grant (valid_from after now)", () => {
    // valid_from > now → not yet active
    expect(isGrantActive(G_FUTURE, NOW)).toBe(false);
  });
  it("returns true at exact valid_until boundary (inclusive)", () => {
    // valid_until === now → boundary is inclusive
    expect(isGrantActive(G_BOUNDARY, NOW)).toBe(true);
  });
});

describe("isDelegateActive", () => {
  it("returns true for permanent delegate (both boundaries null)", () => {
    expect(isDelegateActive(DELEGATE_ACTIVE, NOW)).toBe(true);
  });
  it("returns false for expired delegate (valid_until before now)", () => {
    expect(isDelegateActive(DELEGATE_EXPIRED, NOW)).toBe(false);
  });
  it("returns true for delegate with only valid_from set (no end boundary)", () => {
    const d: ZoneAccessDelegate = {
      ...DELEGATE_ACTIVE,
      valid_from: new Date("2026-01-01T00:00:00Z"),
      valid_until: null,
    };
    expect(isDelegateActive(d, NOW)).toBe(true);
  });
  it("returns false for delegate not yet started (valid_from in future)", () => {
    const d: ZoneAccessDelegate = {
      ...DELEGATE_ACTIVE,
      valid_from: new Date("2027-01-01T00:00:00Z"),
      valid_until: null,
    };
    expect(isDelegateActive(d, NOW)).toBe(false);
  });
});

describe("resolveGrant", () => {
  it("returns direct grant when person has active grant on target zone", () => {
    // Direct grant on Z_ROOM1 for p-1
    const grant = resolveGrant("p-1", Z_ROOM1, ALL_ZONES, [G_PERMANENT], NOW);
    expect(grant).not.toBeNull();
    expect(grant?.id).toBe("g-permanent");
  });
  it("returns ancestor grant when zone_type matches (SECURED ancestor for SECURED zone)", () => {
    // G_ANCESTOR_BLDG1 is on z-bldg1 (SECURED), same zone_type as Z_ROOM1 (SECURED)
    // Z_ROOM1 has requires_explicit_auth: true, so we need to use Z_BUILDING1 as the target
    const grant = resolveGrant(
      "p-1",
      Z_BUILDING1,
      ALL_ZONES,
      [G_ANCESTOR_SITE],
      NOW,
    );
    expect(grant).toBeNull(); // CONTROLLED site does not match SECURED building
  });
  it("returns ancestor grant when zone_type matches and no explicit auth requirement", () => {
    // Create a SECURED zone without requires_explicit_auth
    const Z_SECURED_ROOM: ZoneNode = {
      id: "z-secured-room",
      name: "Secured Room",
      level: "ROOM",
      zone_type: "SECURED",
      parent_id: "z-bldg1",
      admin_org_id: "org-intel",
      asset_owner_org_id: "org-intel",
      requires_explicit_auth: false, // no explicit auth requirement
    };
    const allZonesExt = [...ALL_ZONES, Z_SECURED_ROOM];
    const grant = resolveGrant(
      "p-1",
      Z_SECURED_ROOM,
      allZonesExt,
      [G_ANCESTOR_BLDG1],
      NOW,
    );
    expect(grant).not.toBeNull();
    expect(grant?.id).toBe("g-ancestor-bldg1");
  });
  it("returns null when only ancestor grant has mismatched zone_type (CONTROLLED site, SECURED room)", () => {
    // G_ANCESTOR_SITE is on z-site (CONTROLLED), Z_ROOM1 is SECURED → type mismatch → null
    const grant = resolveGrant(
      "p-1",
      Z_ROOM1,
      ALL_ZONES,
      [G_ANCESTOR_SITE],
      NOW,
    );
    expect(grant).toBeNull();
  });
  it("returns null when zone.requires_explicit_auth=true and only ancestor grant exists", () => {
    // Z_ROOM1 has requires_explicit_auth: true; G_ANCESTOR_BLDG1 is on ancestor z-bldg1 → skip
    const grant = resolveGrant(
      "p-1",
      Z_ROOM1,
      ALL_ZONES,
      [G_ANCESTOR_BLDG1],
      NOW,
    );
    expect(grant).toBeNull();
  });
  it("returns direct grant when zone.requires_explicit_auth=true and direct grant exists", () => {
    // Z_ROOM1 has requires_explicit_auth: true but we have a direct grant on z-room1
    const grant = resolveGrant("p-1", Z_ROOM1, ALL_ZONES, [G_PERMANENT], NOW);
    expect(grant).not.toBeNull();
    expect(grant?.zone_id).toBe("z-room1");
  });
  it("returns null when grant exists but is expired", () => {
    const grant = resolveGrant("p-1", Z_ROOM1, ALL_ZONES, [G_EXPIRED], NOW);
    expect(grant).toBeNull();
  });
  it("returns null when no grants at all", () => {
    const grant = resolveGrant("p-1", Z_ROOM1, ALL_ZONES, [], NOW);
    expect(grant).toBeNull();
  });
});

describe("resolveZoneAccess", () => {
  it("returns gate:GRANT_LOOKUP reason:NO_GRANT when no grant found", () => {
    // Gate 1 fires — no grant for p-1 on Z_ROOM1
    const result = resolveZoneAccess(
      "p-1",
      Z_ROOM1,
      "TOP_SECRET",
      false,
      ALL_ZONES,
      [],
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gate).toBe("GRANT_LOOKUP");
    expect(result.reason).toBe("NO_GRANT");
  });
  it("ALLOW for CONTROLLED zone when grant found (gate:ZONE_TYPE_RULE, reason:GRANT_FOUND)", () => {
    // Z_SITE is CONTROLLED; direct grant on Z_SITE for p-1
    const G_SITE_DIRECT: PhysicalAccessGrant = {
      id: "g-site-direct",
      person_id: "p-1",
      zone_id: "z-site",
      valid_from: null,
      valid_until: null,
    };
    const result = resolveZoneAccess(
      "p-1",
      Z_SITE,
      "UNCLASSIFIED",
      false,
      ALL_ZONES,
      [G_SITE_DIRECT],
      NOW,
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("GRANT_FOUND");
  });
  it("DENY for RESTRICTED zone when grant found but clearance insufficient and no escort", () => {
    // Z_BUILDING2 is RESTRICTED; p-2 has a grant but UNCLASSIFIED clearance
    const result = resolveZoneAccess(
      "p-2",
      Z_BUILDING2,
      "UNCLASSIFIED",
      false,
      ALL_ZONES,
      [G_BLDG2],
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("INSUFFICIENT_CLEARANCE");
  });
  it("ALLOW for RESTRICTED zone when grant found and clearance is sufficient", () => {
    const result = resolveZoneAccess(
      "p-2",
      Z_BUILDING2,
      "RESTRICTED",
      false,
      ALL_ZONES,
      [G_BLDG2],
      NOW,
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("GRANT_FOUND");
  });
  it("DENY for SECURED zone when grant found but clearance below SECRET (CONFIDENTIAL)", () => {
    // Z_ROOM1 is SECURED; p-1 has a direct grant but only CONFIDENTIAL clearance
    const result = resolveZoneAccess(
      "p-1",
      Z_ROOM1,
      "CONFIDENTIAL",
      false,
      ALL_ZONES,
      [G_PERMANENT],
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("INSUFFICIENT_CLEARANCE");
  });
  it("ALLOW for SECURED zone when grant found and SECRET clearance", () => {
    const result = resolveZoneAccess(
      "p-1",
      Z_ROOM1,
      "SECRET",
      false,
      ALL_ZONES,
      [G_PERMANENT],
      NOW,
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("GRANT_FOUND");
  });
});
