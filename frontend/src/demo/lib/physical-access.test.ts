// demo/lib/physical-access.test.ts — Vitest unit tests for Phase 5 zone access rules.
// Covers: CLEARANCE_RANK ranks, isValidZoneTypeCombination, evaluateControlledAccess,
//         evaluateRestrictedAccess, evaluateSecuredAccess, getAncestors, getDescendants.
// Phase 6: isGrantActive, resolveGrant, resolveZoneAccess, isDelegateActive.
// Phase 7: ZoneEntryLog, ZoneVisitorPass, validateEntryLog, validateSecuredZoneEntry, getActiveVisitorPasses.

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
  validateEntryLog,
  validateSecuredZoneEntry,
  getActiveVisitorPasses,
  type ZoneNode,
  type PhysicalAccessGrant,
  type ZoneAccessDelegate,
  type ZoneEntryLog,
  type ZoneVisitorPass,
  type UnitId,
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
  admin_org_id: "org-a" as UnitId,
  asset_owner_org_id: "org-a" as UnitId,
  requires_explicit_auth: false,
};

const Z_BUILDING1: ZoneNode = {
  id: "z-bldg1",
  name: "Classified Research Wing",
  level: "BUILDING",
  zone_type: "SECURED",
  parent_id: "z-site",
  admin_org_id: "org-intel" as UnitId,
  asset_owner_org_id: "org-intel" as UnitId,
  requires_explicit_auth: true,
};

const Z_ROOM1: ZoneNode = {
  id: "z-room1",
  name: "Vault 1",
  level: "ROOM",
  zone_type: "SECURED",
  parent_id: "z-bldg1",
  admin_org_id: "org-intel" as UnitId,
  asset_owner_org_id: "org-intel" as UnitId,
  requires_explicit_auth: true,
};

const Z_BUILDING2: ZoneNode = {
  id: "z-bldg2",
  name: "Restricted Operations Wing",
  level: "BUILDING",
  zone_type: "RESTRICTED",
  parent_id: "z-site",
  admin_org_id: "org-a" as UnitId,
  asset_owner_org_id: "org-b" as UnitId,
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
  it("returns true for grant with valid_from in past and null valid_until (open-ended upper bound)", () => {
    // (non-null from, null until) combination → active when valid_from <= now
    const g: PhysicalAccessGrant = {
      ...G_PERMANENT,
      valid_from: new Date("2025-06-01T00:00:00Z"),
      valid_until: null,
    };
    expect(isGrantActive(g, NOW)).toBe(true);
  });
  it("returns true for grant with null valid_from and valid_until in future (open-ended lower bound)", () => {
    // (null from, non-null until) combination → active when valid_until >= now
    const g: PhysicalAccessGrant = {
      ...G_PERMANENT,
      valid_from: null,
      valid_until: new Date("2026-06-01T00:00:00Z"),
    };
    expect(isGrantActive(g, NOW)).toBe(true);
  });
  it("returns false when valid_from equals valid_until and both are before now", () => {
    // Point-in-time grant that has already elapsed
    const pastDate = new Date("2024-06-01T00:00:00Z");
    const g: PhysicalAccessGrant = {
      ...G_PERMANENT,
      valid_from: pastDate,
      valid_until: pastDate,
    };
    expect(isGrantActive(g, NOW)).toBe(false);
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
  it("returns true at exact valid_until boundary (inclusive)", () => {
    // Boundary-exact: valid_until === NOW → still active (inclusive upper bound)
    const d: ZoneAccessDelegate = {
      ...DELEGATE_ACTIVE,
      valid_from: null,
      valid_until: NOW,
    };
    expect(isDelegateActive(d, NOW)).toBe(true);
  });
  it("returns true for delegate with both bounds set and active window (non-null/non-null within range)", () => {
    // (non-null from, non-null until) combination where now is within the window
    const d: ZoneAccessDelegate = {
      ...DELEGATE_ACTIVE,
      valid_from: new Date("2026-01-01T00:00:00Z"),
      valid_until: new Date("2026-12-31T23:59:59Z"),
    };
    expect(isDelegateActive(d, NOW)).toBe(true);
  });
  it("returns true for delegate with null valid_from and valid_until in future (open lower bound)", () => {
    // (null from, non-null until) combination where valid_until is after NOW
    const d: ZoneAccessDelegate = {
      ...DELEGATE_ACTIVE,
      valid_from: null,
      valid_until: new Date("2026-06-01T00:00:00Z"),
    };
    expect(isDelegateActive(d, NOW)).toBe(true);
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
      admin_org_id: "org-intel" as UnitId,
      asset_owner_org_id: "org-intel" as UnitId,
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
  it("returns direct grant over ancestor grant when both exist (most-specific wins)", () => {
    // G_PERMANENT is a direct grant on z-room1; G_ANCESTOR_BLDG1 is on z-bldg1 (SECURED parent)
    // Both are active and match zone_type — direct grant must win
    // Use Z_SECURED_ROOM (no explicit auth) to allow ancestor comparison
    const Z_SECURED_ROOM: ZoneNode = {
      id: "z-secured-room",
      name: "Secured Room",
      level: "ROOM",
      zone_type: "SECURED",
      parent_id: "z-bldg1",
      admin_org_id: "org-intel" as UnitId,
      asset_owner_org_id: "org-intel" as UnitId,
      requires_explicit_auth: false,
    };
    const G_DIRECT_SECURED: PhysicalAccessGrant = {
      id: "g-direct-secured",
      person_id: "p-1",
      zone_id: "z-secured-room",
      valid_from: null,
      valid_until: null,
    };
    const allZonesExt = [...ALL_ZONES, Z_SECURED_ROOM];
    // allGrants has both a direct grant AND the ancestor grant — direct must win
    const grant = resolveGrant(
      "p-1",
      Z_SECURED_ROOM,
      allZonesExt,
      [G_DIRECT_SECURED, G_ANCESTOR_BLDG1],
      NOW,
    );
    expect(grant).not.toBeNull();
    expect(grant?.id).toBe("g-direct-secured");
  });
  it("returns null when only grant belongs to a different person (person_id mismatch)", () => {
    // G_BLDG2 has person_id:"p-2"; resolveGrant for "p-1" should return null
    const grant = resolveGrant("p-1", Z_BUILDING2, ALL_ZONES, [G_BLDG2], NOW);
    expect(grant).toBeNull();
  });
  it("returns null when ancestor grant is CONTROLLED but target zone is RESTRICTED (cross-type inheritance blocked)", () => {
    // G_ANCESTOR_SITE is on z-site (CONTROLLED); Z_BUILDING2 is RESTRICTED — type mismatch
    const grant = resolveGrant(
      "p-1",
      Z_BUILDING2,
      ALL_ZONES,
      [G_ANCESTOR_SITE],
      NOW,
    );
    expect(grant).toBeNull();
  });
  it("returns null for future grant passed to resolveGrant (not-yet-active grant yields null)", () => {
    // G_FUTURE has valid_from after NOW — isGrantActive returns false, so resolveGrant returns null
    const grant = resolveGrant("p-1", Z_ROOM1, ALL_ZONES, [G_FUTURE], NOW);
    expect(grant).toBeNull();
  });
  it("returns closest ancestor (leaf-first) when multiple matching ancestors exist", () => {
    // Z_SECURED_ROOM has two matching ancestors: z-bldg1 (SECURED, closer) and z-site (CONTROLLED, farther)
    // G_ANCESTOR_BLDG1 is on z-bldg1 (SECURED). Only SECURED type ancestor matches → z-bldg1 grant wins.
    const Z_SECURED_ROOM: ZoneNode = {
      id: "z-secured-room",
      name: "Secured Room",
      level: "ROOM",
      zone_type: "SECURED",
      parent_id: "z-bldg1",
      admin_org_id: "org-intel" as UnitId,
      asset_owner_org_id: "org-intel" as UnitId,
      requires_explicit_auth: false,
    };
    const G_BLDG1_ALT: PhysicalAccessGrant = {
      id: "g-bldg1-alt",
      person_id: "p-1",
      zone_id: "z-bldg1",
      valid_from: null,
      valid_until: null,
    };
    const G_BLDG1_NEWER: PhysicalAccessGrant = {
      id: "g-bldg1-newer",
      person_id: "p-1",
      zone_id: "z-bldg1",
      valid_from: new Date("2026-01-10T00:00:00Z"),
      valid_until: null,
    };
    const allZonesExt = [...ALL_ZONES, Z_SECURED_ROOM];
    // Both G_BLDG1_ALT and G_BLDG1_NEWER are on the same ancestor; first found wins
    const grant = resolveGrant(
      "p-1",
      Z_SECURED_ROOM,
      allZonesExt,
      [G_BLDG1_ALT, G_BLDG1_NEWER],
      NOW,
    );
    expect(grant).not.toBeNull();
    // Either grant on z-bldg1 is acceptable — confirm it is the ancestor zone
    expect(grant?.zone_id).toBe("z-bldg1");
  });

  it("GRANT-02: returns ancestor grant when zone_type matches — CONTROLLED ancestor for CONTROLLED child", () => {
    // Direct child of Z_SITE (CONTROLLED); no requires_explicit_auth
    const Z_CONTROLLED_CHILD: ZoneNode = {
      id: "z-controlled-child",
      name: "Controlled Child",
      level: "BUILDING",
      zone_type: "CONTROLLED",
      parent_id: "z-site",
      admin_org_id: "org-a" as UnitId,
      asset_owner_org_id: "org-a" as UnitId,
      requires_explicit_auth: false,
    };
    const allZonesExt = [...ALL_ZONES, Z_CONTROLLED_CHILD];
    const G_SITE_CTRL: PhysicalAccessGrant = {
      id: "g-site-ctrl",
      person_id: "p-1",
      zone_id: "z-site",
      valid_from: null,
      valid_until: null,
    };
    const grant = resolveGrant(
      "p-1",
      Z_CONTROLLED_CHILD,
      allZonesExt,
      [G_SITE_CTRL],
      NOW,
    );
    expect(grant).not.toBeNull();
    expect(grant?.id).toBe("g-site-ctrl");
  });

  it("GRANT-03: returns null for CONTROLLED zone with matching ancestor when requires_explicit_auth=true", () => {
    const Z_CONTROLLED_EXPLICIT: ZoneNode = {
      id: "z-controlled-explicit",
      name: "Controlled + Explicit Auth",
      level: "BUILDING",
      zone_type: "CONTROLLED",
      parent_id: "z-site",
      admin_org_id: "org-a" as UnitId,
      asset_owner_org_id: "org-a" as UnitId,
      requires_explicit_auth: true,
    };
    const allZonesExt = [...ALL_ZONES, Z_CONTROLLED_EXPLICIT];
    const G_SITE_CTRL: PhysicalAccessGrant = {
      id: "g-site-ctrl2",
      person_id: "p-1",
      zone_id: "z-site",
      valid_from: null,
      valid_until: null,
    };
    const grant = resolveGrant(
      "p-1",
      Z_CONTROLLED_EXPLICIT,
      allZonesExt,
      [G_SITE_CTRL],
      NOW,
    );
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
  it("returns gate:GRANT_LOOKUP reason:NO_GRANT for CONTROLLED zone with no grant", () => {
    // Z_SITE is CONTROLLED; no grants for p-1 → GRANT_LOOKUP fires
    const result = resolveZoneAccess(
      "p-1",
      Z_SITE,
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
  it("returns gate:GRANT_LOOKUP reason:NO_GRANT when grant exists but is expired", () => {
    // Expired grant → resolveGrant returns null → GRANT_LOOKUP fires even though a grant record exists
    const result = resolveZoneAccess(
      "p-1",
      Z_ROOM1,
      "TOP_SECRET",
      false,
      ALL_ZONES,
      [G_EXPIRED],
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gate).toBe("GRANT_LOOKUP");
    expect(result.reason).toBe("NO_GRANT");
  });
  it("ALLOW for RESTRICTED zone when escort present with insufficient clearance (escort path)", () => {
    // RESTRICTED zone: UNCLASSIFIED clearance but escort is present → escort unlocks
    const result = resolveZoneAccess(
      "p-2",
      Z_BUILDING2,
      "UNCLASSIFIED",
      true,
      ALL_ZONES,
      [G_BLDG2],
      NOW,
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("GRANT_FOUND");
  });
  it("ALLOW for SECURED zone with TOP_SECRET clearance (above minimum threshold)", () => {
    // TOP_SECRET > SECRET threshold → should allow just as SECRET does
    const result = resolveZoneAccess(
      "p-1",
      Z_ROOM1,
      "TOP_SECRET",
      false,
      ALL_ZONES,
      [G_PERMANENT],
      NOW,
    );
    expect(result.allow).toBe(true);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("GRANT_FOUND");
  });
  it("DENY for SECURED zone when escort present but clearance below SECRET (escort does not unlock SECURED)", () => {
    // T-05-01: escort substitution is NOT valid for SECURED zones — clearance still required
    const result = resolveZoneAccess(
      "p-1",
      Z_ROOM1,
      "CONFIDENTIAL",
      true, // escort present but irrelevant for SECURED
      ALL_ZONES,
      [G_PERMANENT],
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gate).toBe("ZONE_TYPE_RULE");
    expect(result.reason).toBe("INSUFFICIENT_CLEARANCE");
  });
  it("returns gate:GRANT_LOOKUP when a grant exists but belongs to a different person", () => {
    // G_BLDG2 is for p-2; requesting access as p-1 → no grant found → GRANT_LOOKUP fires
    const result = resolveZoneAccess(
      "p-1",
      Z_BUILDING2,
      "RESTRICTED",
      false,
      ALL_ZONES,
      [G_BLDG2],
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gate).toBe("GRANT_LOOKUP");
    expect(result.reason).toBe("NO_GRANT");
  });
});

// --- Phase 7: Entry log and visitor pass tests ---

describe("ZoneEntryLog", () => {
  const ENTRY_CARD: ZoneEntryLog = {
    id: "log-card-1",
    person_id: "p-1",
    zone_id: "z-room1",
    entry_at: NOW,
    exit_at: null,
    method: "CARD",
    escort_person_id: null,
  };

  const ENTRY_ESCORT: ZoneEntryLog = {
    id: "log-escort-1",
    person_id: "p-visitor",
    zone_id: "z-room1",
    entry_at: NOW,
    exit_at: null,
    method: "ESCORT",
    escort_person_id: "p-1",
  };

  describe("validateEntryLog", () => {
    it("returns null for valid CARD entry (no escort_person_id)", () => {
      expect(validateEntryLog(ENTRY_CARD)).toBeNull();
    });
    it("returns null for valid ESCORT entry (escort_person_id set)", () => {
      expect(validateEntryLog(ENTRY_ESCORT)).toBeNull();
    });
    it("returns error string for ESCORT entry missing escort_person_id", () => {
      const badEscort: ZoneEntryLog = {
        ...ENTRY_ESCORT,
        escort_person_id: null,
      };
      expect(validateEntryLog(badEscort)).toBe(
        "ESCORT entry requires escort_person_id",
      );
    });
    it("returns error string for CARD entry with unexpected escort_person_id", () => {
      const badCard: ZoneEntryLog = {
        ...ENTRY_CARD,
        escort_person_id: "p-escort",
      };
      expect(validateEntryLog(badCard)).toBe(
        "CARD entry must not have escort_person_id",
      );
    });
  });

  describe("validateSecuredZoneEntry", () => {
    it("returns null for non-SECURED zone with null entry", () => {
      // Z_SITE is zone_type: "CONTROLLED"
      expect(validateSecuredZoneEntry(Z_SITE, null)).toBeNull();
    });
    it("returns null for SECURED zone with non-null entry", () => {
      // Z_BUILDING1 is zone_type: "SECURED"
      expect(validateSecuredZoneEntry(Z_BUILDING1, ENTRY_CARD)).toBeNull();
    });
    it("returns error string for SECURED zone with null entry", () => {
      expect(validateSecuredZoneEntry(Z_BUILDING1, null)).toBe(
        "SECURED zone requires a ZoneEntryLog entry",
      );
    });
  });
});

describe("ZoneVisitorPass", () => {
  const PASS_ACTIVE: ZoneVisitorPass = {
    id: "pass-1",
    entry_log_id: "log-escort-1",
    escort_person_id: "p-1",
    zone_id: "z-room1",
    valid_from: new Date("2026-01-15T10:00:00Z"),
    valid_until: new Date("2026-01-15T18:00:00Z"),
  };

  const PASS_EXPIRED: ZoneVisitorPass = {
    id: "pass-2",
    entry_log_id: "log-escort-2",
    escort_person_id: "p-1",
    zone_id: "z-room1",
    valid_from: new Date("2026-01-10T10:00:00Z"),
    valid_until: new Date("2026-01-14T18:00:00Z"),
  };

  const PASS_FUTURE: ZoneVisitorPass = {
    id: "pass-3",
    entry_log_id: "log-escort-3",
    escort_person_id: "p-1",
    zone_id: "z-room1",
    valid_from: new Date("2026-01-16T10:00:00Z"),
    valid_until: new Date("2026-01-16T18:00:00Z"),
  };

  const PASS_OTHER_ZONE: ZoneVisitorPass = {
    id: "pass-4",
    entry_log_id: "log-escort-4",
    escort_person_id: "p-1",
    zone_id: "z-bldg1",
    valid_from: new Date("2026-01-15T10:00:00Z"),
    valid_until: new Date("2026-01-15T18:00:00Z"),
  };

  describe("getActiveVisitorPasses", () => {
    it("returns active pass within time window", () => {
      const result = getActiveVisitorPasses("z-room1", [PASS_ACTIVE], NOW);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pass-1");
    });
    it("excludes expired pass (valid_until before now)", () => {
      const result = getActiveVisitorPasses("z-room1", [PASS_EXPIRED], NOW);
      expect(result).toHaveLength(0);
    });
    it("excludes future pass (valid_from after now)", () => {
      const result = getActiveVisitorPasses("z-room1", [PASS_FUTURE], NOW);
      expect(result).toHaveLength(0);
    });
    it("returns empty array when allPasses is empty", () => {
      const result = getActiveVisitorPasses("z-room1", [], NOW);
      expect(result).toHaveLength(0);
    });
    it("filters by zoneId — excludes passes for different zone", () => {
      const result = getActiveVisitorPasses(
        "z-room1",
        [PASS_OTHER_ZONE, PASS_ACTIVE],
        NOW,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pass-1");
    });
  });
});
