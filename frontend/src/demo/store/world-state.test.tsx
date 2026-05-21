// demo/store/world-state.test.tsx — reducer unit tests.
// Locks the MODEL-02 invariants: immutable new-ref updates, append-only event log,
// the SoD-crux zero-mutation REQUEST_ATTRIBUTE, no-event view actions, and the
// new-ref-drives-recompute proof (R2).

import { describe, it, expect } from "vitest";
import { reducer, seedWorld } from "./world-state";
import { ROLES, type Compartment } from "../lib/model";
import { evaluate, principalFromSubject, type Requirement } from "../lib/abac";

const find = (state: ReturnType<typeof seedWorld>, id: string) =>
  state.subjects.find((s) => s.id === id)!;

// subj-1 (Dana Reyes): MILITARY_1, SECRET, DATA:RESTRICTED, holds [AURORA].
const SUBJ = "subj-1";
const APPROVER_LABEL = ROLES.ACCESS_APPROVER.label;

describe("world-state reducer", () => {
  it("APPROVE_ATTRIBUTE returns a new subject ref + appends one event", () => {
    const state = seedWorld();
    const before = find(state, SUBJ);
    const next = reducer(state, {
      type: "APPROVE_ATTRIBUTE",
      subjectId: SUBJ,
      value: "BLACKWING" as Compartment,
    });
    const after = find(next, SUBJ);

    expect(after).not.toBe(before); // NEW reference
    expect(after.compartments).toContain("BLACKWING");
    expect(before.compartments).not.toContain("BLACKWING"); // original untouched
    expect(next.events.length).toBe(state.events.length + 1);
    expect(next.events.at(-1)!.op).toBe("GRANT_COMPARTMENT");
    expect(next.events.at(-1)!.actor).toBe(APPROVER_LABEL);
    expect(next.seq).toBe(state.seq + 1);
  });

  it("REVOKE_ATTRIBUTE removes the compartment + appends one event", () => {
    const state = seedWorld();
    const next = reducer(state, {
      type: "REVOKE_ATTRIBUTE",
      subjectId: SUBJ,
      value: "AURORA" as Compartment,
    });
    const after = find(next, SUBJ);

    expect(after).not.toBe(find(state, SUBJ));
    expect(after.compartments).not.toContain("AURORA");
    expect(next.events.length).toBe(state.events.length + 1);
    expect(next.events.at(-1)!.op).toBe("REVOKE_COMPARTMENT");
  });

  it("TOGGLE_SECURITY_HOLD flips securityHold on a new flags object + SET_HOLD then CLEAR_HOLD", () => {
    const state = seedWorld();
    const before = find(state, SUBJ);

    const on = reducer(state, {
      type: "TOGGLE_SECURITY_HOLD",
      subjectId: SUBJ,
    });
    const afterOn = find(on, SUBJ);
    expect(afterOn).not.toBe(before);
    expect(afterOn.flags).not.toBe(before.flags); // NEW flags object
    expect(afterOn.flags.securityHold).toBe(true);
    expect(on.events.at(-1)!.op).toBe("SET_HOLD");

    const off = reducer(on, { type: "TOGGLE_SECURITY_HOLD", subjectId: SUBJ });
    expect(find(off, SUBJ).flags.securityHold).toBe(false);
    expect(off.events.at(-1)!.op).toBe("CLEAR_HOLD");
    expect(off.events.length).toBe(state.events.length + 2);
  });

  it("REQUEST_ATTRIBUTE appends an event but mutates NO subject (SoD crux)", () => {
    const state = seedWorld();
    const next = reducer(state, {
      type: "REQUEST_ATTRIBUTE",
      subjectId: SUBJ,
      value: "BLACKWING" as Compartment,
    });

    // Zero mutation: the entire subjects array is the same reference.
    expect(next.subjects).toBe(state.subjects);
    next.subjects.forEach((s, i) => expect(s).toBe(state.subjects[i]));
    expect(next.events.length).toBe(state.events.length + 1);
    expect(next.events.at(-1)!.actor).toBe(APPROVER_LABEL);
  });

  it("SET_ROLE and SET_TARGET append no event", () => {
    const state = seedWorld();

    const roled = reducer(state, { type: "SET_ROLE", role: "MANAGER" });
    expect(roled.currentRole).toBe("MANAGER");
    expect(roled.events.length).toBe(state.events.length);

    const targeted = reducer(state, {
      type: "SET_TARGET",
      subjectId: "subj-2",
    });
    expect(targeted.abacTarget.subjectId).toBe("subj-2");
    expect(targeted.events.length).toBe(state.events.length);
  });

  it("a granted attribute flips the live decision (new-ref drives recompute)", () => {
    const state = seedWorld();
    // DATA resource owned by subj-1's own unit; subj-1 has AURORA but is missing BLACKWING.
    const req: Requirement = {
      minClearance: "SECRET",
      requiredCompartments: ["AURORA", "BLACKWING"],
      ownerUnit: "MILITARY_1",
      domain: "DATA",
      requiredTier: "RESTRICTED",
    };

    const before = evaluate(principalFromSubject(find(state, SUBJ)), req);
    expect(before.decision).toBe("DENY"); // missing BLACKWING (Need-to-know)

    const next = reducer(state, {
      type: "APPROVE_ATTRIBUTE",
      subjectId: SUBJ,
      value: "BLACKWING" as Compartment,
    });
    const after = evaluate(principalFromSubject(find(next, SUBJ)), req);
    expect(after.decision).toBe("ALLOW"); // the NEW subject ref now satisfies NTK
  });
});
