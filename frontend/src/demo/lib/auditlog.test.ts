// demo/lib/auditlog.test.ts — Vitest tests for audit reconstruction (ported from spikes/lib/auditlog.test.ts).
// D3-13: subjects injected as parameter (not imported from seed) for testability.
// D3-14: tests ported alongside lifted lib, adapted to UnitId + subjects param.

import { describe, it, expect } from "vitest";
import { reconstructSubject, whoCanAccess, evaluateWithAuth } from "./auditlog";
import type { AttrEvent } from "./model";
import type { Requirement } from "./abac";
import type { Subject } from "./model";

// Minimal Subject fixture for isolation (D3-13 — do NOT import from seed.ts).
const BASE_SUBJECTS: Subject[] = [
  {
    id: "subj-1",
    name: "Dana Reyes",
    unit: "MILITARY_1",
    clearance: "SECRET",
    domainAuth: { DATA: "RESTRICTED" },
    compartments: ["AURORA"],
    flags: { revoked: false, securityHold: false },
  },
  {
    id: "ca5-subj",
    name: "Maja Vik",
    unit: "INDUSTRY",
    clearance: "SECRET",
    domainAuth: { DATA: "CLASSIFIED" },
    compartments: ["STOCKWATCH"],
    flags: { revoked: false, securityHold: false },
    authorization: {
      status: "WITHDRAWN",
      byRole: "Manager / Supervisor",
      conversationDate: "2026-01-15",
      validUntil: "2026-03-01",
      reauthDue: "2026-06-01",
    },
  },
];

// Resource requirement: DATA/RESTRICTED, SECRET, needs BLACKWING, owned by MILITARY_1.
const REQ: Requirement = {
  minClearance: "SECRET",
  requiredCompartments: ["BLACKWING"],
  ownerUnit: "MILITARY_1",
  domain: "DATA",
  requiredTier: "RESTRICTED",
};

// Events for the reconstruction tests.
const events: AttrEvent[] = [
  {
    seq: 1,
    subjectId: "subj-1",
    op: "GRANT_COMPARTMENT",
    value: "BLACKWING",
    actor: "Access Approver / AO",
  },
  { seq: 2, subjectId: "subj-1", op: "SET_HOLD", actor: "Security Officer" },
  { seq: 3, subjectId: "subj-1", op: "CLEAR_HOLD", actor: "Security Officer" },
  {
    seq: 4,
    subjectId: "ca5-subj",
    op: "AUTHORIZE_SUBJECT",
    actor: "Manager / Supervisor",
  },
  {
    seq: 5,
    subjectId: "ca5-subj",
    op: "WITHDRAW_AUTHORIZATION",
    actor: "Manager / Supervisor",
  },
];

describe("reconstructSubject", () => {
  it("returns null for an unknown subject id", () => {
    expect(
      reconstructSubject("does-not-exist", BASE_SUBJECTS, events, 99),
    ).toBeNull();
  });

  it("asOf=0: returns clean base state with no events applied", () => {
    const s = reconstructSubject("subj-1", BASE_SUBJECTS, events, 0)!;
    expect(s).not.toBeNull();
    expect(s.compartments).toEqual(["AURORA"]);
    expect(s.flags.securityHold).toBe(false);
  });

  it("GRANT_COMPARTMENT adds the compartment (asOf=1)", () => {
    const s = reconstructSubject("subj-1", BASE_SUBJECTS, events, 1)!;
    expect(s.compartments).toContain("BLACKWING");
    expect(s.compartments).toContain("AURORA");
  });

  it("GRANT_COMPARTMENT is idempotent — no duplicates", () => {
    // Grant AURORA again (already in base) — dedup check.
    const dupeEvents: AttrEvent[] = [
      {
        seq: 1,
        subjectId: "subj-1",
        op: "GRANT_COMPARTMENT",
        value: "AURORA",
        actor: "AO",
      },
    ];
    const s = reconstructSubject("subj-1", BASE_SUBJECTS, dupeEvents, 1)!;
    expect(s.compartments.filter((c) => c === "AURORA").length).toBe(1);
  });

  it("REVOKE_COMPARTMENT removes the compartment", () => {
    const revokeEvents: AttrEvent[] = [
      {
        seq: 1,
        subjectId: "subj-1",
        op: "REVOKE_COMPARTMENT",
        value: "AURORA",
        actor: "AO",
      },
    ];
    const s = reconstructSubject("subj-1", BASE_SUBJECTS, revokeEvents, 1)!;
    expect(s.compartments).not.toContain("AURORA");
  });

  it("SET_HOLD sets securityHold to true (asOf=2)", () => {
    const s = reconstructSubject("subj-1", BASE_SUBJECTS, events, 2)!;
    expect(s.flags.securityHold).toBe(true);
  });

  it("CLEAR_HOLD clears securityHold (asOf=3)", () => {
    const s = reconstructSubject("subj-1", BASE_SUBJECTS, events, 3)!;
    expect(s.flags.securityHold).toBe(false);
  });

  it("AUTHORIZE_SUBJECT sets authorization.status to AUTHORIZED", () => {
    const s = reconstructSubject("ca5-subj", BASE_SUBJECTS, events, 4)!;
    expect(s.authorization?.status).toBe("AUTHORIZED");
  });

  it("WITHDRAW_AUTHORIZATION sets authorization.status to WITHDRAWN", () => {
    const s = reconstructSubject("ca5-subj", BASE_SUBJECTS, events, 5)!;
    expect(s.authorization?.status).toBe("WITHDRAWN");
  });

  it("does not mutate the original base subject", () => {
    const original = BASE_SUBJECTS[0];
    const originalCompartments = [...original.compartments];
    reconstructSubject("subj-1", BASE_SUBJECTS, events, 3);
    expect(original.compartments).toEqual(originalCompartments);
    expect(original.flags.securityHold).toBe(false);
  });
});

describe("evaluateWithAuth", () => {
  it("returns the base evaluate result when authorization is undefined (no auth field)", () => {
    const subject = BASE_SUBJECTS[0]; // subj-1, no authorization field
    const result = evaluateWithAuth(subject, {
      minClearance: "UNCLASSIFIED",
      requiredCompartments: [],
      ownerUnit: "MILITARY_1",
    });
    // No authorization field — should not add Authorization valid rule
    expect(
      result.rules.find((r) => r.name === "Authorization valid"),
    ).toBeUndefined();
  });

  it("returns DENY with Authorization valid rule when authorization.status is WITHDRAWN", () => {
    const maja = BASE_SUBJECTS[1]; // ca5-subj, status: WITHDRAWN
    const result = evaluateWithAuth(maja, {
      minClearance: "UNCLASSIFIED",
      requiredCompartments: [],
      ownerUnit: "INDUSTRY",
    });
    expect(result.decision).toBe("DENY");
    const authRule = result.rules.find((r) => r.name === "Authorization valid");
    expect(authRule).toBeDefined();
    expect(authRule?.pass).toBe(false);
    expect(authRule?.detail).toContain("WITHDRAWN");
    expect(result.failed).toContain("Authorization valid");
  });

  it("does NOT add Authorization valid rule when status is AUTHORIZED", () => {
    const authorizedSubject: Subject = {
      ...BASE_SUBJECTS[1],
      authorization: {
        status: "AUTHORIZED",
        byRole: "Manager / Supervisor",
        conversationDate: "2026-01-15",
        validUntil: "2026-12-01",
        reauthDue: "2026-11-01",
      },
    };
    const result = evaluateWithAuth(authorizedSubject, {
      minClearance: "UNCLASSIFIED",
      requiredCompartments: [],
      ownerUnit: "INDUSTRY",
    });
    expect(
      result.rules.find((r) => r.name === "Authorization valid"),
    ).toBeUndefined();
  });
});

describe("whoCanAccess", () => {
  it("before any grant (asOf=0): subj-1 cannot access (missing BLACKWING)", () => {
    const rows = whoCanAccess(REQ, events, BASE_SUBJECTS, 0);
    expect(rows.some((r) => r.subjectId === "subj-1")).toBe(false);
  });

  it("after GRANT_COMPARTMENT (asOf=1): subj-1 can access", () => {
    const rows = whoCanAccess(REQ, events, BASE_SUBJECTS, 1);
    expect(rows.some((r) => r.subjectId === "subj-1")).toBe(true);
  });

  it("after SET_HOLD (asOf=2): subj-1 cannot access (deny override)", () => {
    const rows = whoCanAccess(REQ, events, BASE_SUBJECTS, 2);
    expect(rows.some((r) => r.subjectId === "subj-1")).toBe(false);
  });

  it("after CLEAR_HOLD (asOf=3): subj-1 can access again", () => {
    const rows = whoCanAccess(REQ, events, BASE_SUBJECTS, 3);
    expect(rows.some((r) => r.subjectId === "subj-1")).toBe(true);
  });

  it("returns subjects where decision is ALLOW", () => {
    const rows = whoCanAccess(REQ, events, BASE_SUBJECTS, 1);
    for (const row of rows) {
      expect(row.decision.decision).toBe("ALLOW");
    }
  });
});
