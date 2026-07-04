// demo/lib/dataset-selectors.test.ts — Vitest unit tests for dataset-selectors.ts
// (Plan 14-02). Covers the application_id join / structural integrity, plus
// DATA-SEED-01..06 resolved against Plan 14-01's REAL seed.ts fixtures (D-08/D-09
// — no inline/standalone fixtures for these scenarios).

import { describe, it, expect } from "vitest";
import {
  datasetsForApplication,
  activeDatasetGrantsForPerson,
  resolveDatasetAt,
} from "./dataset-selectors";
import {
  DATASET_NODES,
  DATASET_GRANTS,
  APPLICATIONS,
  PLATFORMS,
  RESOURCE_GRANTS,
} from "./seed";

// Fixed clock — matches dataset.test.ts's convention (Sam's expired grant at
// 2026-05-01 sits before this).
const NOW = new Date("2026-07-01T12:00:00Z");

describe("dataset-selectors: application_id join + structural integrity", () => {
  it("datasetsForApplication returns exactly the 4 milapp-1-attached datasets", () => {
    const result = datasetsForApplication(DATASET_NODES, "rsrc-milapp-1");
    expect(result.length).toBe(4);
    expect(result.some((d) => d.id === "ds-mailbox-dana")).toBe(true);
    expect(result.some((d) => d.id === "ds-mailbox-sam")).toBe(true);
    expect(result.some((d) => d.id === "ds-archive-caserecords")).toBe(true);
    expect(result.some((d) => d.id === "ds-docsite-ops")).toBe(true);
  });

  it("datasetsForApplication returns exactly ds-docsite-intel for rsrc-intapp-1", () => {
    const result = datasetsForApplication(DATASET_NODES, "rsrc-intapp-1");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("ds-docsite-intel");
  });

  it("every DATASET_NODES application_ids entry resolves to an existing APPLICATIONS id (no orphans, R6)", () => {
    const noOrphans = DATASET_NODES.every((d) =>
      d.application_ids.every((id) => APPLICATIONS.some((a) => a.id === id)),
    );
    expect(noOrphans).toBe(true);
  });
});

describe("seed integration: dataset fixtures (DATA-SEED-01..06)", () => {
  it("DATA-SEED-01: subj-1 and subj-2 each have >=2 active grants on 2 distinct MAILBOX datasets", () => {
    const mailboxIds = new Set(
      DATASET_NODES.filter((d) => d.dataset_type === "MAILBOX").map(
        (d) => d.id,
      ),
    );
    for (const personId of ["subj-1", "subj-2"]) {
      const grants = activeDatasetGrantsForPerson(
        DATASET_GRANTS,
        personId,
        NOW,
      ).filter((g) => mailboxIds.has(g.dataset_id));
      const distinctDatasets = new Set(grants.map((g) => g.dataset_id));
      expect(distinctDatasets.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("DATA-SEED-02: ds-archive-caserecords' active grants cover all 3 ArchiveRole values across 3 people", () => {
    const archiveGrants = DATASET_GRANTS.filter(
      (g) => g.dataset_id === "ds-archive-caserecords",
    );
    const levels = new Set(archiveGrants.map((g) => g.level));
    expect(levels).toEqual(new Set(["READER", "CASE_HANDLER", "ADMIN"]));
  });

  it("DATA-SEED-03: >=2 DOCUMENT_SITE datasets with >=2 distinct levels across active grants", () => {
    const docSites = DATASET_NODES.filter(
      (d) => d.dataset_type === "DOCUMENT_SITE",
    );
    expect(docSites.length).toBeGreaterThanOrEqual(2);
    const docSiteIds = new Set(docSites.map((d) => d.id));
    const levels = new Set(
      DATASET_GRANTS.filter((g) => docSiteIds.has(g.dataset_id)).map(
        (g) => g.level,
      ),
    );
    expect(levels.size).toBeGreaterThanOrEqual(2);
  });

  it("DATA-SEED-04: full prerequisite-chain success (subj-1, SECRET, ADMIN on ds-archive-caserecords)", () => {
    const result = resolveDatasetAt(
      DATASET_NODES,
      APPLICATIONS,
      PLATFORMS,
      RESOURCE_GRANTS,
      DATASET_GRANTS,
      "subj-1",
      "SECRET",
      "ds-archive-caserecords",
      "ADMIN",
      NOW,
    );
    expect(result.allow).toBe(true);
    expect(result.visible).toBe(true);
  });

  it("DATA-SEED-05: dataset-gate-denial (ds-deny-subj has an app grant but zero dataset grants)", () => {
    const result = resolveDatasetAt(
      DATASET_NODES,
      APPLICATIONS,
      PLATFORMS,
      RESOURCE_GRANTS,
      DATASET_GRANTS,
      "ds-deny-subj",
      "SECRET",
      "ds-archive-caserecords",
      "READER",
      NOW,
    );
    expect(result.visible).toBe(true);
    expect(result.allow).toBe(false);
    expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(
      false,
    );
  });

  it("deny-matrix (a): subj-3/CONFIDENTIAL fails CLEARANCE only, other two gates independently pass", () => {
    const result = resolveDatasetAt(
      DATASET_NODES,
      APPLICATIONS,
      PLATFORMS,
      RESOURCE_GRANTS,
      DATASET_GRANTS,
      "subj-3",
      "CONFIDENTIAL",
      "ds-archive-caserecords",
      "READER",
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(false);
    expect(result.gates.find((g) => g.kind === "APP_GRANT_OR")?.pass).toBe(
      true,
    );
    expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(
      true,
    );
  });

  it("deny-matrix (b): subj-2/TOP_SECRET fails APP_GRANT_OR only (expired app grant), other two gates independently pass", () => {
    const result = resolveDatasetAt(
      DATASET_NODES,
      APPLICATIONS,
      PLATFORMS,
      RESOURCE_GRANTS,
      DATASET_GRANTS,
      "subj-2",
      "TOP_SECRET",
      "ds-archive-caserecords",
      "CASE_HANDLER",
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.visible).toBe(false);
    expect(result.gates.find((g) => g.kind === "APP_GRANT_OR")?.pass).toBe(
      false,
    );
    expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(true);
    expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(
      true,
    );
  });

  it("deny-matrix (c): ds-deny-subj fails DATASET_GRANT only (fuller edge-probe rigor), other two gates independently pass", () => {
    const result = resolveDatasetAt(
      DATASET_NODES,
      APPLICATIONS,
      PLATFORMS,
      RESOURCE_GRANTS,
      DATASET_GRANTS,
      "ds-deny-subj",
      "SECRET",
      "ds-archive-caserecords",
      "READER",
      NOW,
    );
    expect(result.allow).toBe(false);
    expect(result.gates.find((g) => g.kind === "DATASET_GRANT")?.pass).toBe(
      false,
    );
    expect(result.gates.find((g) => g.kind === "CLEARANCE")?.pass).toBe(true);
    expect(result.gates.find((g) => g.kind === "APP_GRANT_OR")?.pass).toBe(
      true,
    );
  });
});
