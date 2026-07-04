// demo/lib/dataset.test.ts — Vitest unit tests for the Phase 13 (v2.3)
// dataset model: per-type vocabularies, classification derive-with-override,
// and effective-access aggregation. Sibling of digital-resource.test.ts.
//
// Conventions (mirrors digital-resource.test.ts / physical-access.test.ts):
// inline fixtures only (NO seed.ts import — "D3-13 pattern"); a single fixed NOW
// constant shared across describe blocks. All tested functions are pure and take
// explicit arguments.
//
// Coverage:
//   - validateDatasetNode: rejects empty application_ids, accepts populated.
//   - isLevelInVocabulary: correct membership for all three dataset types,
//     wrong-vocabulary rejection (MAILBOX vocab cannot accept DOCUMENT_SITE
//     levels, and vice-versa; ARCHIVE_ROLE cannot accept MAILBOX/DOCUMENT_SITE
//     levels).
//   - archiveRoleCovers: full pairwise matrix (self-coverage, forward
//     containment, non-reverse, transitive ADMIN->READER).
//   - effectiveDatasetClassification: null-override returns derived;
//     override-wins when set; fail-loud on divergent multi-Application
//     classifications; throw on non-existent application_id.
//   - validateDatasetClassification: null-override passes; equal override
//     passes; strictly-lower override rejected with descriptive error.
//   - effectiveRankedLevel: rank-max across active grants, null on empty.
//   - effectiveArchiveCoverage: containment-union across ALL active roles
//     (not collapsed to one "highest"), empty input yields empty Set,
//     idempotent union for overlapping roles.

import { describe, it, expect } from "vitest";
import {
  archiveRoleCovers,
  assertNeverDatasetType,
  DOCUMENT_SITE_LEVELS,
  effectiveArchiveCoverage,
  effectiveDatasetClassification,
  effectiveRankedLevel,
  isLevelInVocabulary,
  MAILBOX_LEVELS,
  resolveDatasetAccess,
  validateDatasetClassification,
  validateDatasetNode,
  type ApplicationNode,
  type Clearance,
  type DatasetAccessGrant,
  type DatasetNode,
  type PlatformNode,
  type ResourceAccessGrant,
} from "./model";

// --- Minimal inline fixtures (D3-13 pattern) ---

// Helper: build a Platform with the given classification.
function makePlatform(id: string, classification: Clearance): PlatformNode {
  return {
    id,
    name: `Platform-${id}`,
    tier: "PLATFORM",
    classification,
    network_id: "NET-1",
    org_links: [],
    policy_assignments: [],
  };
}

// Helper: build an Application attached to a platform, with no classification
// field of its own (effective comes from the host platform).
function makeApplication(id: string, platformId: string): ApplicationNode {
  return {
    id,
    name: `App-${id}`,
    tier: "APPLICATION",
    platform_id: platformId,
    org_links: [],
    policy_assignments: [],
  };
}

// Helper: build a DatasetNode with sane defaults.
function makeDataset(overrides: Partial<DatasetNode> = {}): DatasetNode {
  return {
    id: `ds-${Object.keys(overrides).join("-") || "default"}`,
    name: "Test Dataset",
    dataset_type: "MAILBOX",
    application_ids: ["APP-1"],
    classification_override: null,
    admin_org_id: "ORG-ADMIN",
    asset_owner_org_id: "ORG-OWNER",
    ...overrides,
  };
}

// =====================================================================
// Task 1: validateDatasetNode
// =====================================================================

describe("validateDatasetNode", () => {
  it("rejects an empty application_ids array", () => {
    const emptyDs = makeDataset({
      application_ids: [],
      id: "ds-empty-apps",
    });
    const err = validateDatasetNode(emptyDs);
    expect(err).not.toBeNull();
    expect(err).toContain("empty");
    expect(err).toContain("application_ids");
  });

  it("accepts a populated application_ids array", () => {
    const validDs = makeDataset({
      application_ids: ["APP-1", "APP-2"],
      id: "ds-valid-apps",
    });
    const err = validateDatasetNode(validDs);
    expect(err).toBeNull();
  });

  it("accepts a single-element application_ids array", () => {
    const singleDs = makeDataset({
      application_ids: ["APP-1"],
      id: "ds-single-app",
    });
    expect(validateDatasetNode(singleDs)).toBeNull();
  });
});

// =====================================================================
// Task 1: isLevelInVocabulary
// =====================================================================

describe("isLevelInVocabulary", () => {
  // --- MAILBOX vocabulary ---
  it("accepts MAILBOX levels (READ, SEND_AS, FULL_ACCESS)", () => {
    expect(isLevelInVocabulary("MAILBOX", "READ")).toBe(true);
    expect(isLevelInVocabulary("MAILBOX", "SEND_AS")).toBe(true);
    expect(isLevelInVocabulary("MAILBOX", "FULL_ACCESS")).toBe(true);
  });

  it("rejects DOCUMENT_SITE level CONTRIBUTE from MAILBOX vocabulary", () => {
    expect(isLevelInVocabulary("MAILBOX", "CONTRIBUTE")).toBe(false);
  });

  it("rejects FULL_CONTROL from MAILBOX vocabulary", () => {
    expect(isLevelInVocabulary("MAILBOX", "FULL_CONTROL")).toBe(false);
  });

  // --- DOCUMENT_SITE vocabulary ---
  it("accepts DOCUMENT_SITE levels (READ, CONTRIBUTE, FULL_CONTROL)", () => {
    expect(isLevelInVocabulary("DOCUMENT_SITE", "READ")).toBe(true);
    expect(isLevelInVocabulary("DOCUMENT_SITE", "CONTRIBUTE")).toBe(true);
    expect(isLevelInVocabulary("DOCUMENT_SITE", "FULL_CONTROL")).toBe(true);
  });

  it("rejects MAILBOX level SEND_AS from DOCUMENT_SITE vocabulary", () => {
    expect(isLevelInVocabulary("DOCUMENT_SITE", "SEND_AS")).toBe(false);
  });

  it("rejects FULL_ACCESS from DOCUMENT_SITE vocabulary", () => {
    expect(isLevelInVocabulary("DOCUMENT_SITE", "FULL_ACCESS")).toBe(false);
  });

  // --- ARCHIVE_ROLE vocabulary ---
  it("accepts ARCHIVE_ROLE (READER, CASE_HANDLER, ADMIN)", () => {
    expect(isLevelInVocabulary("ARCHIVE_ROLE", "READER")).toBe(true);
    expect(isLevelInVocabulary("ARCHIVE_ROLE", "CASE_HANDLER")).toBe(true);
    expect(isLevelInVocabulary("ARCHIVE_ROLE", "ADMIN")).toBe(true);
  });

  it("rejects MAILBOX level SEND_AS from ARCHIVE_ROLE vocabulary", () => {
    expect(isLevelInVocabulary("ARCHIVE_ROLE", "SEND_AS")).toBe(false);
  });

  it("rejects CONTRIBUTE from ARCHIVE_ROLE vocabulary", () => {
    expect(isLevelInVocabulary("ARCHIVE_ROLE", "CONTRIBUTE")).toBe(false);
  });

  it("rejects unknown string from all vocabularies", () => {
    expect(isLevelInVocabulary("MAILBOX", "GARBAGE")).toBe(false);
    expect(isLevelInVocabulary("DOCUMENT_SITE", "GARBAGE")).toBe(false);
    expect(isLevelInVocabulary("ARCHIVE_ROLE", "GARBAGE")).toBe(false);
  });
});

// =====================================================================
// Task 1: archiveRoleCovers (full pairwise matrix)
// =====================================================================

describe("archiveRoleCovers", () => {
  it("ADMIN covers CASE_HANDLER (forward containment)", () => {
    expect(archiveRoleCovers("ADMIN", "CASE_HANDLER")).toBe(true);
  });

  it("ADMIN covers READER (transitive containment)", () => {
    expect(archiveRoleCovers("ADMIN", "READER")).toBe(true);
  });

  it("CASE_HANDLER covers READER (forward containment)", () => {
    expect(archiveRoleCovers("CASE_HANDLER", "READER")).toBe(true);
  });

  it("CASE_HANDLER does NOT cover ADMIN (no reverse containment)", () => {
    expect(archiveRoleCovers("CASE_HANDLER", "ADMIN")).toBe(false);
  });

  it("READER does NOT cover CASE_HANDLER", () => {
    expect(archiveRoleCovers("READER", "CASE_HANDLER")).toBe(false);
  });

  it("READER does NOT cover ADMIN", () => {
    expect(archiveRoleCovers("READER", "ADMIN")).toBe(false);
  });

  it("self-coverage: ADMIN covers ADMIN", () => {
    expect(archiveRoleCovers("ADMIN", "ADMIN")).toBe(true);
  });

  it("self-coverage: CASE_HANDLER covers CASE_HANDLER", () => {
    expect(archiveRoleCovers("CASE_HANDLER", "CASE_HANDLER")).toBe(true);
  });

  it("self-coverage: READER covers READER", () => {
    expect(archiveRoleCovers("READER", "READER")).toBe(true);
  });

  it("ADMIN does NOT cover itself indirectly without the self-match short-circuit", () => {
    // ADMIN's direct children are CASE_HANDLER and READER. ADMIN is not in
    // ARCHIVE_ROLE_CONTAINS[ADMIN]. The function still returns true via the
    // held === required short-circuit.
    expect(archiveRoleCovers("ADMIN", "ADMIN")).toBe(true);
  });

  it("CASE_HANDLER does NOT cover ADMIN even transitively", () => {
    // CASE_HANDLER -> READER (no further descendants). ADMIN is unreachable.
    expect(archiveRoleCovers("CASE_HANDLER", "ADMIN")).toBe(false);
  });

  it("assertNeverDatasetType throws for unhandled values", () => {
    expect(() => assertNeverDatasetType("GARBAGE" as never)).toThrow(
      "Unhandled dataset type",
    );
  });
});

// =====================================================================
// Task 2: effectiveDatasetClassification
// =====================================================================

describe("effectiveDatasetClassification", () => {
  const platformSecret = makePlatform("PLAT-SECRET", "SECRET");
  const platformConfidential = makePlatform(
    "PLAT-CONFIDENTIAL",
    "CONFIDENTIAL",
  );
  const appSecret = makeApplication("APP-SECRET", "PLAT-SECRET");
  const appConfidential = makeApplication(
    "APP-CONFIDENTIAL",
    "PLAT-CONFIDENTIAL",
  );
  const platforms = [platformSecret, platformConfidential];

  it("returns the parent Application's effective classification when override is null", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET"],
      classification_override: null,
      id: "ds-no-override",
    });
    expect(effectiveDatasetClassification(ds, [appSecret], platforms)).toBe(
      "SECRET",
    );
  });

  it("returns the override when classification_override is set (no clamping)", () => {
    const ds = makeDataset({
      application_ids: ["APP-CONFIDENTIAL"],
      classification_override: "SECRET",
      id: "ds-override-wins",
    });
    // Parent resolves to CONFIDENTIAL, override is SECRET (higher). Override
    // wins without clamping.
    expect(
      effectiveDatasetClassification(ds, [appConfidential], platforms),
    ).toBe("SECRET");
  });

  it("returns the override even when it is strictly lower than the parent (override wins at this layer)", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET"],
      classification_override: "CONFIDENTIAL",
      id: "ds-override-lower",
    });
    // This function does NOT clamp. validateDatasetClassification is the
    // enforcement point.
    expect(effectiveDatasetClassification(ds, [appSecret], platforms)).toBe(
      "CONFIDENTIAL",
    );
  });

  it("throws when linked Applications resolve to divergent classifications (fail-loud)", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET", "APP-CONFIDENTIAL"],
      classification_override: null,
      id: "ds-divergent",
    });
    expect(() =>
      effectiveDatasetClassification(
        ds,
        [appSecret, appConfidential],
        platforms,
      ),
    ).toThrow(/divergent|diverge/i);
  });

  it("throws when a referenced application_id does not exist", () => {
    const ds = makeDataset({
      application_ids: ["APP-NONEXISTENT"],
      classification_override: null,
      id: "ds-missing-app",
    });
    expect(() => effectiveDatasetClassification(ds, [], platforms)).toThrow(
      /not found/i,
    );
  });
});

// =====================================================================
// Task 2: validateDatasetClassification
// =====================================================================

describe("validateDatasetClassification", () => {
  const platformSecret = makePlatform("PLAT-SECRET", "SECRET");
  const appSecret = makeApplication("APP-SECRET", "PLAT-SECRET");
  const platforms = [platformSecret];

  it("returns null when classification_override is null (no override to validate)", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET"],
      classification_override: null,
      id: "ds-ov-null",
    });
    expect(
      validateDatasetClassification(ds, [appSecret], platforms),
    ).toBeNull();
  });

  it("returns null when override equals parent effective classification", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET"],
      classification_override: "SECRET",
      id: "ds-ov-equal",
    });
    expect(
      validateDatasetClassification(ds, [appSecret], platforms),
    ).toBeNull();
  });

  it("rejects an override strictly lower than parent effective classification", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET"],
      classification_override: "UNCLASSIFIED",
      id: "ds-ov-lower",
    });
    const err = validateDatasetClassification(ds, [appSecret], platforms);
    expect(err).not.toBeNull();
    expect(err).toContain("strictly lower");
    expect(err).toContain("UNCLASSIFIED");
    expect(err).toContain("SECRET");
  });

  it("rejects CONFIDENTIAL override against SECRET parent", () => {
    const ds = makeDataset({
      application_ids: ["APP-SECRET"],
      classification_override: "CONFIDENTIAL",
      id: "ds-ov-conf-vs-secret",
    });
    expect(
      validateDatasetClassification(ds, [appSecret], platforms),
    ).not.toBeNull();
  });
});

// =====================================================================
// Task 3: effectiveRankedLevel
// =====================================================================

describe("effectiveRankedLevel", () => {
  it("returns the highest-ranked level from multiple active grants", () => {
    const result = effectiveRankedLevel(MAILBOX_LEVELS, [
      "READ",
      "FULL_ACCESS",
      "SEND_AS",
    ]);
    expect(result).toBe("FULL_ACCESS");
  });

  it("returns the single level when only one grant is active", () => {
    const result = effectiveRankedLevel(MAILBOX_LEVELS, ["SEND_AS"]);
    expect(result).toBe("SEND_AS");
  });

  it("returns null when no active grants", () => {
    const result = effectiveRankedLevel(MAILBOX_LEVELS, []);
    expect(result).toBeNull();
  });

  it("returns the highest-ranked level for DOCUMENT_SITE", () => {
    const result = effectiveRankedLevel(DOCUMENT_SITE_LEVELS, [
      "READ",
      "FULL_CONTROL",
      "CONTRIBUTE",
    ]);
    expect(result).toBe("FULL_CONTROL");
  });

  it("skips unknown levels (does not crash, does not elevate)", () => {
    const result = effectiveRankedLevel(MAILBOX_LEVELS, [
      "READ",
      "GARBAGE",
      "SEND_AS",
    ]);
    expect(result).toBe("SEND_AS");
  });
});

// =====================================================================
// Task 3: effectiveArchiveCoverage
// =====================================================================

describe("effectiveArchiveCoverage", () => {
  it("CASE_HANDLER covers CASE_HANDLER and READER but NOT ADMIN", () => {
    const coverage = effectiveArchiveCoverage(["CASE_HANDLER"]);
    expect(coverage.has("CASE_HANDLER")).toBe(true);
    expect(coverage.has("READER")).toBe(true);
    expect(coverage.has("ADMIN")).toBe(false);
  });

  it("ADMIN covers ADMIN, CASE_HANDLER, and READER", () => {
    const coverage = effectiveArchiveCoverage(["ADMIN"]);
    expect(coverage.has("ADMIN")).toBe(true);
    expect(coverage.has("CASE_HANDLER")).toBe(true);
    expect(coverage.has("READER")).toBe(true);
  });

  it("READER covers only READER", () => {
    const coverage = effectiveArchiveCoverage(["READER"]);
    expect(coverage.has("READER")).toBe(true);
    expect(coverage.has("CASE_HANDLER")).toBe(false);
    expect(coverage.has("ADMIN")).toBe(false);
  });

  it("empty input yields empty Set", () => {
    const coverage = effectiveArchiveCoverage([]);
    expect(coverage.size).toBe(0);
    expect(coverage.has("READER")).toBe(false);
  });

  it("union across multiple active roles (idempotent, not additive)", () => {
    // CASE_HANDLER covers {CASE_HANDLER, READER}. READER covers {READER}.
    // Union = {CASE_HANDLER, READER}. Same as CASE_HANDLER alone.
    const coverage = effectiveArchiveCoverage(["CASE_HANDLER", "READER"]);
    expect(coverage.has("CASE_HANDLER")).toBe(true);
    expect(coverage.has("READER")).toBe(true);
    expect(coverage.has("ADMIN")).toBe(false);
    expect(coverage.size).toBe(2);
  });

  it("CASE_HANDLER + ADMIN yields full coverage", () => {
    const coverage = effectiveArchiveCoverage(["CASE_HANDLER", "ADMIN"]);
    expect(coverage.has("ADMIN")).toBe(true);
    expect(coverage.has("CASE_HANDLER")).toBe(true);
    expect(coverage.has("READER")).toBe(true);
    expect(coverage.size).toBe(3);
  });
});

// =====================================================================
// Plan 13-02 Task 1: resolveDatasetAccess (3-gate chain + visibility)
// =====================================================================

// Single fixed NOW for all point-in-time resolver tests (Pitfall 8: never
// Date.now() — all windows are checked against this explicit timestamp).
const NOW = new Date("2026-07-01T12:00:00Z");
// A window that ended strictly before NOW (expired at evaluation time).
const EXPIRED_UNTIL = new Date("2026-06-01T00:00:00Z");

// Helper: active-unless-overridden Application-level ResourceAccessGrant.
function makeAppGrant(
  personId: string,
  resourceId: string,
  overrides: Partial<ResourceAccessGrant> = {},
): ResourceAccessGrant {
  return {
    id: `ag-${personId}-${resourceId}`,
    person_id: personId,
    resource_id: resourceId,
    valid_from: null,
    valid_until: null,
    ...overrides,
  };
}

// Helper: active-unless-overridden DatasetAccessGrant.
function makeDatasetGrant(
  personId: string,
  datasetId: string,
  level: string,
  overrides: Partial<DatasetAccessGrant> = {},
): DatasetAccessGrant {
  return {
    id: `dg-${personId}-${datasetId}-${level}`,
    person_id: personId,
    dataset_id: datasetId,
    level,
    valid_from: null,
    valid_until: null,
    ...overrides,
  };
}

describe("resolveDatasetAccess — 3-gate chain", () => {
  // Shared world: one SECRET platform, two Applications on it (same effective
  // classification, so effectiveDatasetClassification's all-share assert holds).
  const platform = makePlatform("PLAT-1", "SECRET");
  const app1 = makeApplication("APP-1", "PLAT-1");
  const app2 = makeApplication("APP-2", "PLAT-1");
  const apps = [app1, app2];
  const platforms = [platform];

  it("denies when the app grant expired before now, even with a still-active dataset grant (APP_GRANT_OR is the sole failing gate)", () => {
    const ds = makeDataset({ id: "ds-r1", application_ids: ["APP-1"] });
    const expiredAppGrant = makeAppGrant("p1", "APP-1", {
      valid_until: EXPIRED_UNTIL,
    });
    const liveDatasetGrant = makeDatasetGrant("p1", "ds-r1", "READ");

    const result = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [expiredAppGrant],
      [liveDatasetGrant],
      "READ",
      NOW,
    );

    expect(result.allow).toBe(false);
    const appGate = result.gates.find((g) => g.kind === "APP_GRANT_OR");
    expect(appGate?.pass).toBe(false);
    // The OTHER two substantive gates pass — the app-grant gate alone decides.
    expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(true);
    expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(
      true,
    );
    expect(result.visible).toBe(false);
  });

  it("OR across application_ids: an active grant on exactly ONE of two linked Applications suffices", () => {
    const ds = makeDataset({
      id: "ds-r2",
      application_ids: ["APP-1", "APP-2"],
    });
    // Grant only on APP-2 — none on APP-1. OR-gate must still pass.
    const appGrant = makeAppGrant("p1", "APP-2");
    const datasetGrant = makeDatasetGrant("p1", "ds-r2", "READ");

    const result = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [appGrant],
      [datasetGrant],
      "READ",
      NOW,
    );

    expect(result.allow).toBe(true);
    expect(result.visible).toBe(true);
    expect(result.gates.find((g) => g.kind === "APP_GRANT_OR")?.pass).toBe(
      true,
    );
  });

  it("app grant but NO dataset grant -> visible: true, allow: false (distinct reachable state)", () => {
    const ds = makeDataset({ id: "ds-r3", application_ids: ["APP-1"] });
    const appGrant = makeAppGrant("p1", "APP-1");

    const result = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [appGrant],
      [],
      "READ",
      NOW,
    );

    expect(result.visible).toBe(true);
    expect(result.allow).toBe(false);
    expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(
      false,
    );
  });

  it("orphan case: dataset grant held directly but ZERO qualifying app grants -> visible: false, no exemption", () => {
    const ds = makeDataset({ id: "ds-r4", application_ids: ["APP-1"] });
    const orphanDatasetGrant = makeDatasetGrant("p1", "ds-r4", "FULL_ACCESS");

    const result = resolveDatasetAccess(
      "p1",
      "TOP_SECRET", // ample clearance — visibility must STILL be false
      ds,
      apps,
      platforms,
      [], // zero app grants
      [orphanDatasetGrant],
      "READ",
      NOW,
    );

    expect(result.visible).toBe(false);
    expect(result.allow).toBe(false);
    expect(result.gates.find((g) => g.kind === "VISIBILITY")?.pass).toBe(false);
  });

  it("denies on insufficient clearance with CLEARANCE as the failing gate (visible stays true)", () => {
    const ds = makeDataset({ id: "ds-r5", application_ids: ["APP-1"] });
    const appGrant = makeAppGrant("p1", "APP-1");
    const datasetGrant = makeDatasetGrant("p1", "ds-r5", "READ");

    const result = resolveDatasetAccess(
      "p1",
      "UNCLASSIFIED", // dataset is SECRET via platform
      ds,
      apps,
      platforms,
      [appGrant],
      [datasetGrant],
      "READ",
      NOW,
    );

    expect(result.allow).toBe(false);
    expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(false);
    expect(result.gates.find((g) => g.kind === "APP_GRANT_OR")?.pass).toBe(
      true,
    );
    expect(result.visible).toBe(true);
  });

  it("throws when requiredLevel is from the WRONG dataset type's vocabulary (rank-table type)", () => {
    const ds = makeDataset({ id: "ds-r6", application_ids: ["APP-1"] });
    // CONTRIBUTE is a DOCUMENT_SITE level — never valid against a MAILBOX.
    expect(() =>
      resolveDatasetAccess(
        "p1",
        "SECRET",
        ds,
        apps,
        platforms,
        [makeAppGrant("p1", "APP-1")],
        [],
        "CONTRIBUTE",
        NOW,
      ),
    ).toThrow(/not in the vocabulary/i);
  });

  it("throws when requiredLevel is from the WRONG vocabulary (containment type)", () => {
    const ds = makeDataset({
      id: "ds-r7",
      dataset_type: "ARCHIVE_ROLE",
      application_ids: ["APP-1"],
    });
    // SEND_AS is a MAILBOX level — never valid against an ARCHIVE_ROLE.
    expect(() =>
      resolveDatasetAccess(
        "p1",
        "SECRET",
        ds,
        apps,
        platforms,
        [makeAppGrant("p1", "APP-1")],
        [],
        "SEND_AS",
        NOW,
      ),
    ).toThrow(/not in the vocabulary/i);
  });

  it("throws when the dataset references a non-existent application_id (fail-closed, not silent deny)", () => {
    const ds = makeDataset({
      id: "ds-r8",
      application_ids: ["APP-NONEXISTENT"],
    });
    expect(() =>
      resolveDatasetAccess(
        "p1",
        "SECRET",
        ds,
        apps,
        platforms,
        [],
        [],
        "READ",
        NOW,
      ),
    ).toThrow(/not found/i);
  });

  it("gate trace has exactly 4 entries in canonical order CLEARANCE, APP_GRANT_OR, DATASET_GRANT, VISIBILITY", () => {
    const ds = makeDataset({ id: "ds-r9", application_ids: ["APP-1"] });
    const result = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [makeAppGrant("p1", "APP-1")],
      [makeDatasetGrant("p1", "ds-r9", "READ")],
      "READ",
      NOW,
    );
    expect(result.gates.length).toBe(4);
    expect(result.gates.map((g) => g.kind)).toEqual([
      "CLEARANCE",
      "APP_GRANT_OR",
      "DATASET_GRANT",
      "VISIBILITY",
    ]);
  });

  it("ARCHIVE_ROLE gate 3 goes through containment: a CASE_HANDLER grant satisfies a READER requirement", () => {
    const ds = makeDataset({
      id: "ds-r10",
      dataset_type: "ARCHIVE_ROLE",
      application_ids: ["APP-1"],
    });
    const result = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [makeAppGrant("p1", "APP-1")],
      [makeDatasetGrant("p1", "ds-r10", "CASE_HANDLER")],
      "READER",
      NOW,
    );
    expect(result.allow).toBe(true);
    // ...but the same grant does NOT satisfy ADMIN (no reverse containment).
    const denied = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [makeAppGrant("p1", "APP-1")],
      [makeDatasetGrant("p1", "ds-r10", "CASE_HANDLER")],
      "ADMIN",
      NOW,
    );
    expect(denied.allow).toBe(false);
  });
});

// Named pitfall tests (digital-resource.test.ts convention): exactly-named,
// each proving one prohibition/pitfall is structurally blocked.
describe("resolveDatasetAccess — named pitfall blocking tests", () => {
  const platform = makePlatform("PLAT-1", "SECRET");
  const app1 = makeApplication("APP-1", "PLAT-1");
  const apps = [app1];
  const platforms = [platform];

  it("visible-allow-independence", () => {
    // DATA-ACCESS-04 prohibition: visible and allow are independent fields.
    // Both non-trivial combinations must be reachable.
    const ds = makeDataset({ id: "ds-p1", application_ids: ["APP-1"] });

    // Subject A: app grant only -> visible: true, allow: false.
    const onlyVisible = resolveDatasetAccess(
      "subj-a",
      "SECRET",
      ds,
      apps,
      platforms,
      [makeAppGrant("subj-a", "APP-1")],
      [],
      "READ",
      NOW,
    );
    expect(onlyVisible.visible).toBe(true);
    expect(onlyVisible.allow).toBe(false);

    // Subject B: dataset grant only (orphan) -> visible: false, allow: false.
    const notVisible = resolveDatasetAccess(
      "subj-b",
      "SECRET",
      ds,
      apps,
      platforms,
      [],
      [makeDatasetGrant("subj-b", "ds-p1", "READ")],
      "READ",
      NOW,
    );
    expect(notVisible.visible).toBe(false);
    expect(notVisible.allow).toBe(false);
  });

  it("malformed-stored-grant-excluded-not-thrown", () => {
    // Pitfall B: a stored grant with an out-of-vocabulary level is bad DATA,
    // not a bad CALL — it is silently excluded from gate 3, never thrown, and
    // sibling valid grants for the same subject/dataset still resolve normally.
    const ds = makeDataset({ id: "ds-p2", application_ids: ["APP-1"] });
    const badGrant = makeDatasetGrant("p1", "ds-p2", "CONTRIBUTE"); // DOCUMENT_SITE level on a MAILBOX
    const goodGrant = makeDatasetGrant("p1", "ds-p2", "SEND_AS");
    const appGrant = makeAppGrant("p1", "APP-1");

    // With the bad grant ALONGSIDE a valid one: no throw, valid grant resolves.
    const result = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [appGrant],
      [badGrant, goodGrant],
      "READ",
      NOW,
    );
    expect(result.allow).toBe(true);

    // With ONLY the bad grant: denied (not thrown) — the grant is excluded.
    const deniedNotThrown = resolveDatasetAccess(
      "p1",
      "SECRET",
      ds,
      apps,
      platforms,
      [appGrant],
      [badGrant],
      "READ",
      NOW,
    );
    expect(deniedNotThrown.allow).toBe(false);
    expect(
      deniedNotThrown.gates.find((g) => g.kind === "DATASET_GRANT")?.pass,
    ).toBe(false);
  });
});
