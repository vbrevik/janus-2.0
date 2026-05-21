// Spike 007 — audit reconstruction. Under pure-ABAC there are no stored grants, so the
// append-only event log IS the system of record. Replay events to reconstruct access at any time.
import { SUBJECTS, type Compartment, type Subject } from "./data";
import {
  evaluate,
  principalFromSubject,
  type Decision,
  type Requirement,
} from "./abac";

export type AttrOp =
  | "GRANT_COMPARTMENT"
  | "REVOKE_COMPARTMENT"
  | "SET_HOLD"
  | "CLEAR_HOLD";

export interface AttrEvent {
  seq: number; // logical timestamp (append-only, increasing)
  subjectId: string;
  op: AttrOp;
  value?: Compartment;
  actor: string; // which operating role made the change (audit trail)
}

function cloneSubject(s: Subject): Subject {
  return { ...s, compartments: [...s.compartments], flags: { ...s.flags } };
}

// Replay all events with seq <= asOf onto the base subject.
export function reconstructSubject(
  subjectId: string,
  events: AttrEvent[],
  asOf: number,
): Subject | null {
  const base = SUBJECTS.find((s) => s.id === subjectId);
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
    }
  }
  return state;
}

export interface AccessRow {
  subjectId: string;
  name: string;
  decision: Decision;
}

// Who can access a resource AS OF a point in time — computed by replaying the log, not stored.
export function whoCanAccess(
  req: Requirement,
  events: AttrEvent[],
  asOf: number,
): AccessRow[] {
  const rows: AccessRow[] = [];
  for (const base of SUBJECTS) {
    const state = reconstructSubject(base.id, events, asOf)!;
    const decision = evaluate(principalFromSubject(state), req);
    if (decision.decision === "ALLOW")
      rows.push({ subjectId: base.id, name: base.name, decision });
  }
  return rows;
}
