// demo/lib/auditlog.ts — audit-log reconstruction for the Authorization Hub demo.
// Lifted from spikes/lib/auditlog.ts (D-01/D3-12) with adaptations:
//   - subjects injected as parameter (D3-13) — NOT imported from seed
//   - UnitId replaces spike EntityId (D-10)
//   - handles all 8 AttrOps from model.ts including D-11 authorization lifecycle ops
//   - evaluateWithAuth wrapper adds "Authorization valid" rule (D3-04 / OQ-B)

import { evaluate, principalFromSubject } from "./abac";
import type { Decision, Requirement } from "./abac";
import type { Subject, AttrEvent } from "./model";

// Deep-clone a subject to avoid mutating the base seed during replay.
function cloneSubject(s: Subject): Subject {
  return {
    ...s,
    compartments: [...s.compartments],
    flags: { ...s.flags },
    authorization: s.authorization ? { ...s.authorization } : undefined,
  };
}

// Replay all events with seq <= asOf onto the matching base subject.
// subjects is injected (D3-13) — callers pass worldState.subjects or test fixtures.
export function reconstructSubject(
  subjectId: string,
  subjects: Subject[],
  events: AttrEvent[],
  asOf: number,
): Subject | null {
  const base = subjects.find((s) => s.id === subjectId);
  if (!base) return null;
  const state = cloneSubject(base);
  for (const e of events
    .filter((e) => e.subjectId === subjectId && e.seq <= asOf)
    .sort((a, b) => a.seq - b.seq)) {
    switch (e.op) {
      case "GRANT_COMPARTMENT":
        if (e.value && !state.compartments.includes(e.value))
          state.compartments.push(e.value);
        break;
      case "REVOKE_COMPARTMENT":
        if (e.value)
          state.compartments = state.compartments.filter((c) => c !== e.value);
        break;
      case "SET_HOLD":
        state.flags.securityHold = true;
        break;
      case "CLEAR_HOLD":
        state.flags.securityHold = false;
        break;
      case "SET_REVOKED":
        state.flags.revoked = true;
        break;
      case "CLEAR_REVOKED":
        state.flags.revoked = false;
        break;
      case "AUTHORIZE_SUBJECT":
        if (state.authorization) {
          state.authorization = {
            ...state.authorization,
            status: "AUTHORIZED",
          };
        }
        break;
      case "WITHDRAW_AUTHORIZATION":
        if (state.authorization) {
          state.authorization = { ...state.authorization, status: "WITHDRAWN" };
        }
        break;
      default:
        // Silently ignore unknown ops for forward compatibility.
        break;
    }
  }
  return state;
}

// Authorization-gate evaluator (D3-04 / OQ-B).
// Calls base evaluate() then appends "Authorization valid" rule if status !== AUTHORIZED.
// abac.ts is frozen (D-01) — the auth check lives here as a post-evaluate pass.
export function evaluateWithAuth(subject: Subject, req: Requirement): Decision {
  const base = evaluate(principalFromSubject(subject), req);
  const auth = subject.authorization;
  if (auth && auth.status !== "AUTHORIZED") {
    return {
      ...base,
      decision: "DENY",
      rules: [
        ...base.rules,
        {
          name: "Authorization valid",
          pass: false,
          detail: `authorization.status=${auth.status} (requires AUTHORIZED)`,
        },
      ],
      failed: [...base.failed, "Authorization valid"],
    };
  }
  return base;
}

export interface AccessRow {
  subjectId: string;
  name: string;
  decision: Decision;
}

// Who can access a resource AS OF a point in time — computed by replaying the log, not stored.
// subjects injected (D3-13); callers pass worldState.subjects or test fixtures.
export function whoCanAccess(
  req: Requirement,
  events: AttrEvent[],
  subjects: Subject[],
  asOf: number,
): AccessRow[] {
  const rows: AccessRow[] = [];
  for (const base of subjects) {
    const state = reconstructSubject(base.id, subjects, events, asOf)!;
    const decision = evaluateWithAuth(state, req);
    if (decision.decision === "ALLOW")
      rows.push({ subjectId: base.id, name: base.name, decision });
  }
  return rows;
}
