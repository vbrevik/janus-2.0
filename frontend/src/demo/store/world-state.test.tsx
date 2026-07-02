// demo/store/world-state.test.tsx — reducer unit tests.
// Locks the MODEL-02 invariants: immutable new-ref updates, append-only event log,
// the SoD-crux zero-mutation REQUEST_ATTRIBUTE, no-event view actions, and the
// new-ref-drives-recompute proof (R2).

import { describe, it, expect } from "vitest";
import { reducer, seedWorld } from "./world-state";
import {
  ROLES,
  type Compartment,
  type DigitalResourceWorld,
  type ResourceAccessDelegate,
  type ResourceAccessGrant,
} from "../lib/model";
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

  describe("TOGGLE_RESOURCE_GRANT action", () => {
    it("toggles disabledResourceGrantIds on then off", () => {
      const state = seedWorld();
      expect(state.digitalResources.disabledResourceGrantIds.size).toBe(0);

      // Toggle ON
      const toggledOn = reducer(state, {
        type: "TOGGLE_RESOURCE_GRANT",
        resourceGrantId: "rsrc-grant-milnet-active",
      });
      expect(toggledOn.digitalResources.disabledResourceGrantIds.size).toBe(1);
      expect(
        toggledOn.digitalResources.disabledResourceGrantIds.has(
          "rsrc-grant-milnet-active",
        ),
      ).toBe(true);
      // Immutable update: new Set reference
      expect(toggledOn.digitalResources.disabledResourceGrantIds).not.toBe(
        state.digitalResources.disabledResourceGrantIds,
      );

      // Toggle OFF (again)
      const toggledOff = reducer(toggledOn, {
        type: "TOGGLE_RESOURCE_GRANT",
        resourceGrantId: "rsrc-grant-milnet-active",
      });
      expect(
        toggledOff.digitalResources.disabledResourceGrantIds.has(
          "rsrc-grant-milnet-active",
        ),
      ).toBe(false);
      expect(toggledOff.digitalResources.disabledResourceGrantIds.size).toBe(0);
    });

    it("physical TOGGLE_GRANT does not touch digitalResources", () => {
      const state = seedWorld();
      expect(state.disabledGrantIds.size).toBe(0);
      expect(state.digitalResources.disabledResourceGrantIds.size).toBe(0);

      // Physical toggle only affects disabledGrantIds
      const toggled = reducer(state, {
        type: "TOGGLE_GRANT",
        grantId: "grant-dana-block-a",
      });
      expect(toggled.disabledGrantIds.size).toBe(1);
      expect(toggled.disabledGrantIds.has("grant-dana-block-a")).toBe(true);
      expect(toggled.digitalResources.disabledResourceGrantIds.size).toBe(0);
      // Physical toggle only changes disabledGrantIds; digitalResources unchanged.
    });
  });

  describe("SET_DIGITAL_RESOURCES action", () => {
    const emptyWorld = (): DigitalResourceWorld => ({
      networks: [],
      platforms: [],
      applications: [],
      orgLinks: [],
      policies: [],
      policyAssignments: [],
      grants: [],
      delegates: [],
      disabledResourceGrantIds: new Set(),
    });

    it("replaces digitalResources with the dispatched world", () => {
      const state = seedWorld();
      const world = emptyWorld();
      world.networks = [
        {
          id: "net-1",
          name: "MilNet",
          tier: "NETWORK",
          classification: "SECRET",
          org_links: [],
          policy_assignments: [],
        },
      ];

      const next = reducer(state, {
        type: "SET_DIGITAL_RESOURCES",
        world,
      });

      expect(next.digitalResources.networks).toBe(world.networks);
      expect(next.digitalResources.platforms).toBe(world.platforms);
    });

    it("preserves disabledResourceGrantIds from prior state across a dispatch with an empty Set", () => {
      const state = seedWorld();
      const toggled = reducer(state, {
        type: "TOGGLE_RESOURCE_GRANT",
        resourceGrantId: "rsrc-grant-milnet-active",
      });
      expect(
        toggled.digitalResources.disabledResourceGrantIds.has(
          "rsrc-grant-milnet-active",
        ),
      ).toBe(true);

      // Dispatched world's disabledResourceGrantIds is a fresh empty Set (as a
      // real mapWorldResponse() refetch always produces).
      const next = reducer(toggled, {
        type: "SET_DIGITAL_RESOURCES",
        world: emptyWorld(),
      });

      expect(
        next.digitalResources.disabledResourceGrantIds.has(
          "rsrc-grant-milnet-active",
        ),
      ).toBe(true);
    });
  });

  describe("UPSERT_RESOURCE_GRANT / UPSERT_RESOURCE_DELEGATE actions", () => {
    const grantFixture = (
      overrides: Partial<ResourceAccessGrant> = {},
    ): ResourceAccessGrant => ({
      id: "grant-1",
      person_id: "person-1",
      resource_id: "net-1",
      valid_from: null,
      valid_until: null,
      ...overrides,
    });

    const delegateFixture = (
      overrides: Partial<ResourceAccessDelegate> = {},
    ): ResourceAccessDelegate => ({
      id: "delegate-1",
      resource_id: "net-1",
      delegate_type: "PERSON",
      delegate_person_id: "person-2",
      delegate_org_id: null,
      granted_by_org_id: "MILITARY_1",
      valid_from: null,
      valid_until: null,
      ...overrides,
    });

    it("UPSERT_RESOURCE_GRANT appends when the id is novel", () => {
      const state = seedWorld();
      expect(state.digitalResources.grants).toHaveLength(0);

      const next = reducer(state, {
        type: "UPSERT_RESOURCE_GRANT",
        grant: grantFixture(),
      });

      expect(next.digitalResources.grants).toHaveLength(1);
      expect(next.digitalResources.grants[0].id).toBe("grant-1");
    });

    it("UPSERT_RESOURCE_GRANT replaces in place (same length) when the id already exists", () => {
      const state = seedWorld();
      const withGrant = reducer(state, {
        type: "UPSERT_RESOURCE_GRANT",
        grant: grantFixture(),
      });

      const until = new Date("2026-06-01T00:00:00Z");
      const next = reducer(withGrant, {
        type: "UPSERT_RESOURCE_GRANT",
        grant: grantFixture({ valid_until: until }),
      });

      expect(next.digitalResources.grants).toHaveLength(1);
      expect(next.digitalResources.grants[0].valid_until).toBe(until);
    });

    it("UPSERT_RESOURCE_DELEGATE appends when the id is novel", () => {
      const state = seedWorld();
      expect(state.digitalResources.delegates).toHaveLength(0);

      const next = reducer(state, {
        type: "UPSERT_RESOURCE_DELEGATE",
        delegate: delegateFixture(),
      });

      expect(next.digitalResources.delegates).toHaveLength(1);
      expect(next.digitalResources.delegates[0].id).toBe("delegate-1");
    });

    it("UPSERT_RESOURCE_DELEGATE replaces in place (same length) when the id already exists", () => {
      const state = seedWorld();
      const withDelegate = reducer(state, {
        type: "UPSERT_RESOURCE_DELEGATE",
        delegate: delegateFixture(),
      });

      const next = reducer(withDelegate, {
        type: "UPSERT_RESOURCE_DELEGATE",
        delegate: delegateFixture({ delegate_org_id: "MILITARY_2" }),
      });

      expect(next.digitalResources.delegates).toHaveLength(1);
      expect(next.digitalResources.delegates[0].delegate_org_id).toBe(
        "MILITARY_2",
      );
    });
  });
});
