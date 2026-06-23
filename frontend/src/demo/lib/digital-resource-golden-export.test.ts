// @vitest-environment node
//
// Golden-fixture EXPORTER (Phase 11, Plan 02 — RSRC-BE-02, D-06).
//
// Not an assertion test: this run computes the TS resolver's output at three
// FIXED timestamps and writes them to a committed JSON file that the Rust
// parity test (backend/tests/resolver_parity.rs) loads and asserts byte-equal
// against the ported Rust resolver. The three mandatory cases:
//   1. milnet_now_a       — mid-window ALLOW
//   2. milnet_boundary    — exactly at valid_until (inclusive must still ALLOW)
//   3. no_policy_deny      — before all windows -> NO_ACTIVE_POLICY fail-closed DENY
//
// Determinism: every timestamp is a fixed Date literal (never new Date()), and
// the resolver itself takes an explicit `now`. The JSON is serialized with a
// replacer that normalizes Date -> the naive `YYYY-MM-DDTHH:MM:SS` form that
// Rust's chrono::NaiveDateTime serde emits, so the two engines' outputs are
// byte-equal (the golden file is the cross-engine contract).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import {
  resolveResourceAccess,
  type NetworkNode,
  type ResourcePolicy,
  type PolicyAssignment,
  type ResourceAccessGrant,
} from "./model";

// --- Fixed clock (D-06 mandatory timestamps) ---
const GOLDEN_NOW_A = new Date("2026-02-15T12:00:00Z"); // mid-window ALLOW
const GOLDEN_NOW_BOUNDARY = new Date("2026-02-28T23:59:59Z"); // inclusive valid_until
const GOLDEN_NO_POLICY_NOW = new Date("2025-06-01T00:00:00Z"); // before all windows

// MilNet baseline policy window: open start, closes at 2026-02-28T23:59:59Z.
// GOLDEN_NOW_A is mid-window; GOLDEN_NOW_BOUNDARY is exactly valid_until
// (inclusive -> still selected); GOLDEN_NO_POLICY_NOW (2025) precedes it.
// Bounded window [2026-02-01 .. 2026-02-28T23:59:59]. GOLDEN_NO_POLICY_NOW
// (2025-06-01) precedes valid_from -> no covering policy -> NO_ACTIVE_POLICY.
const POLICY_VALID_FROM = new Date("2026-02-01T00:00:00Z");
const POLICY_VALID_UNTIL = new Date("2026-02-28T23:59:59Z");

const BASELINE_POLICY: ResourcePolicy = {
  id: "pol-milnet-baseline",
  label: "MilNet Baseline",
  gates: [
    { kind: "CLEARANCE" },
    { kind: "OWN_TIER_GRANT" },
    { kind: "PARENT_TIER_GRANT" },
  ],
  zone_prereq_id: null,
};

const MILNET_ASSIGNMENT: PolicyAssignment = {
  policy: BASELINE_POLICY,
  valid_from: POLICY_VALID_FROM,
  valid_until: POLICY_VALID_UNTIL,
};

// MilNet network (top of tree, no parent -> PARENT_TIER passes trivially).
const MILNET: NetworkNode = {
  id: "rsrc-milnet",
  name: "MilNet",
  tier: "NETWORK",
  classification: "SECRET",
  org_links: [],
  policy_assignments: [MILNET_ASSIGNMENT],
};

// subj-1 holds an own-tier grant on MilNet and has SECRET clearance, so all
// three baseline gates pass while a covering policy is active.
const SUBJECT = "subj-1";
const SUBJECT_CLEARANCE = "SECRET" as const;
const SUBJECT_ORG = "MILITARY_1";

const OWN_GRANT: ResourceAccessGrant = {
  id: "g-milnet-subj1",
  person_id: SUBJECT,
  resource_id: "rsrc-milnet",
  valid_from: null,
  valid_until: null,
};
const GRANTS: ResourceAccessGrant[] = [OWN_GRANT];

function resolveAt(now: Date) {
  return resolveResourceAccess(
    SUBJECT,
    SUBJECT_CLEARANCE,
    SUBJECT_ORG,
    MILNET,
    [MILNET],
    [], // no platforms needed (Network uses own classification)
    GRANTS,
    [], // no zones
    [], // no physical grants
    now,
  );
}

// Normalize Date -> chrono::NaiveDateTime's serde form: YYYY-MM-DDTHH:MM:SS
// (UTC wall-clock, no millis, no trailing Z). Also drop the TS-only
// `zoneAdvisory` key and rename camelCase -> snake_case so the object matches
// the Rust ResourceAccessResult serde shape exactly.
function toNaive(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "");
}

function normalizeResult(r: ReturnType<typeof resolveAt>) {
  const out: Record<string, unknown> = {
    allow: r.allow,
    gates: r.gates.map((g) => ({
      kind: g.kind,
      pass: g.pass,
      reason: g.reason,
    })),
    zone_advisory: null, // Rust stubs this to null for Phase 11 (deviation Q3)
    policy_version:
      r.policyVersion === null
        ? null
        : {
            valid_from:
              r.policyVersion.valid_from === null
                ? null
                : toNaive(r.policyVersion.valid_from),
            valid_until:
              r.policyVersion.valid_until === null
                ? null
                : toNaive(r.policyVersion.valid_until),
          },
  };
  // reason is omitted (skip_serializing_if on the Rust side) unless present —
  // only the NO_ACTIVE_POLICY path carries a top-level reason.
  if (r.reason !== undefined) {
    out.reason = r.reason;
  }
  return out;
}

it("emits resolver golden fixtures for the Rust parity test", () => {
  const golden = {
    milnet_now_a: normalizeResult(resolveAt(GOLDEN_NOW_A)),
    milnet_boundary: normalizeResult(resolveAt(GOLDEN_NOW_BOUNDARY)),
    no_policy_deny: normalizeResult(resolveAt(GOLDEN_NO_POLICY_NOW)),
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(
    here,
    "../../../../backend/tests/fixtures/resolver-golden.json",
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(golden, null, 2) + "\n", "utf8");
});
