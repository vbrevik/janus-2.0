// Spike 007 — audit reconstruction. Drag the timeline; "who can access" is recomputed by
// replaying the append-only log up to that point (no stored grants).
import { useState } from "react";
import {
  reconstructSubject,
  whoCanAccess,
  type AttrEvent,
} from "../lib/auditlog";
import type { Requirement } from "../lib/abac";
import { Card, Pill } from "./ui";

const REQ: Requirement = {
  minClearance: "SECRET",
  requiredCompartments: ["BLACKWING"],
  ownerEntity: "ENTITY_A",
  domain: "DATA",
  requiredTier: "RESTRICTED",
};

const EVENTS: AttrEvent[] = [
  {
    seq: 1,
    subjectId: "subj-1",
    op: "GRANT_COMPARTMENT",
    value: "BLACKWING",
    actor: "Access Approver",
  },
  { seq: 2, subjectId: "subj-1", op: "SET_HOLD", actor: "Security Officer" },
  { seq: 3, subjectId: "subj-1", op: "CLEAR_HOLD", actor: "Security Officer" },
];
const MAX = 3;

export function Spike007Audit() {
  const [asOf, setAsOf] = useState(MAX);
  const dana = reconstructSubject("subj-1", EVENTS, asOf)!;
  const allowed = whoCanAccess(REQ, EVENTS, asOf);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Pure-ABAC stores no grants — so "who has access?" is answered by{" "}
        <strong>replaying the log</strong>. Resource: Project Aurora Brief (DATA
        · RESTRICTED · needs BLACKWING). Drag time to any point and the answer
        recomputes, including revocations and holds.
      </p>

      <Card title={`Timeline — as of T = ${asOf}`}>
        <input
          type="range"
          min={0}
          max={MAX}
          value={asOf}
          onChange={(e) => setAsOf(Number(e.target.value))}
          className="w-full"
        />
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {EVENTS.map((e) => (
            <li
              key={e.seq}
              className={e.seq <= asOf ? "text-slate-700" : "text-slate-300"}
            >
              T{e.seq} · {e.actor}: {e.op}
              {e.value ? ` ${e.value}` : ""}{" "}
              {e.seq <= asOf ? "✓ applied" : "· future"}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Reconstructed state — Dana Reyes">
          <div className="flex flex-wrap gap-1">
            <Pill tone="blue">{dana.clearance}</Pill>
            {dana.compartments.map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
            {dana.flags.securityHold && <Pill tone="red">SECURITY HOLD</Pill>}
          </div>
        </Card>
        <Card title={`Who can access — as of T=${asOf}`}>
          {allowed.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nobody can access this resource at this point in time.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {allowed.map((r) => (
                <li key={r.subjectId} className="text-green-700">
                  ✓ {r.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        T0 none → T1 Dana (granted BLACKWING) → T2 none (security hold) → T3
        Dana again (hold cleared). The log is the system of record; current
        access is a projection of it.
      </p>
    </div>
  );
}
