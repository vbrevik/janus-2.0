// Spike 004 — operating-role separation of duties. The SAME access scenario, different roles:
// who may change the decision, who may only ask, who is read-only, who is locked out.
import { useMemo, useState } from "react";
import { SUBJECTS, ROLES, type RoleId, type Compartment } from "../lib/data";
import { evaluate, type Requirement } from "../lib/abac";
import { Card, DecisionTrace, Field, Pill, Select } from "./ui";

const DANA = SUBJECTS.find((s) => s.id === "subj-1")!;
const SCENARIO: Requirement = {
  minClearance: "SECRET",
  requiredCompartments: ["BLACKWING"],
  ownerEntity: "ENTITY_A",
  domain: "DATA",
  requiredTier: "RESTRICTED",
};

interface LogEntry {
  t: string;
  actor: string;
  action: string;
}

export function Spike004Sod() {
  const [role, setRole] = useState<RoleId>("ACCESS_APPROVER");
  const [compartments, setCompartments] = useState<Compartment[]>([
    ...DANA.compartments,
  ]);
  const [hold, setHold] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const roleDef = ROLES[role];
  const can = (op: string) => roleDef.ops.includes(op as never);

  const result = useMemo(
    () =>
      evaluate(
        {
          entity: DANA.homeEntity,
          clearance: DANA.clearance,
          domainAuth: DANA.domainAuth,
          compartments,
          flags: { securityHold: hold },
        },
        SCENARIO,
      ),
    [compartments, hold],
  );

  function logAction(action: string) {
    setLog((l) => [
      {
        t: new Date().toISOString().slice(11, 19),
        actor: roleDef.label,
        action,
      },
      ...l,
    ]);
  }
  function grantBlackwing() {
    setCompartments((c) => (c.includes("BLACKWING") ? c : [...c, "BLACKWING"]));
    logAction("approved attribute: BLACKWING granted to Dana");
  }
  function revokeBlackwing() {
    setCompartments((c) => c.filter((x) => x !== "BLACKWING"));
    logAction("revoked attribute: BLACKWING removed from Dana");
  }
  function toggleHold() {
    setHold((h) => !h);
    logAction(
      hold ? "cleared security hold on Dana" : "placed security hold on Dana",
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Scenario: <strong>Dana Reyes</strong> requesting the{" "}
        <strong>Project Aurora Brief</strong> (DATA · RESTRICTED · needs
        BLACKWING). The decision below is live. Switch roles — the available
        actions change, but the policy doesn't.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <Field label="Acting as role">
            <Select
              value={role}
              onChange={setRole}
              options={(Object.keys(ROLES) as RoleId[]).map((r) => ({
                value: r,
                label: ROLES[r].label,
              }))}
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-1">
            {roleDef.ops.map((o) => (
              <Pill key={o}>{o}</Pill>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Actions this role may take
            </span>
            {can("approve_attribute") && (
              <div className="flex gap-2">
                <button
                  onClick={grantBlackwing}
                  className="rounded bg-green-700 px-3 py-1.5 text-xs text-white"
                >
                  Approve: grant BLACKWING
                </button>
                <button
                  onClick={revokeBlackwing}
                  className="rounded bg-amber-700 px-3 py-1.5 text-xs text-white"
                >
                  Revoke: remove BLACKWING
                </button>
              </div>
            )}
            {can("flag_risk") && (
              <button
                onClick={toggleHold}
                className="rounded bg-red-700 px-3 py-1.5 text-xs text-white"
              >
                {hold ? "Clear security hold" : "Place security hold"}
              </button>
            )}
            {can("request_attribute") && (
              <button
                onClick={() =>
                  logAction(
                    "requested attribute: BLACKWING for Dana (awaiting Approver)",
                  )
                }
                className="rounded bg-slate-700 px-3 py-1.5 text-xs text-white"
              >
                Request BLACKWING (cannot grant)
              </button>
            )}
            {!can("approve_attribute") &&
              !can("flag_risk") &&
              !can("request_attribute") && (
                <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">
                  This role holds no access-decision authority — separation of
                  duties.{" "}
                  {can("view_eval") || can("view_all_readonly")
                    ? "Read-only visibility only."
                    : ""}
                </p>
              )}
          </div>
        </Card>

        <Card title="Live decision (same policy for everyone)">
          <DecisionTrace result={result} />
        </Card>
      </div>

      <Card title={`Audit / evaluation log (${log.length})`}>
        {log.length === 0 ? (
          <p className="text-sm text-slate-400">
            No actions yet. Auditor sees this log read-only; it is the system of
            record under pure-ABAC.
          </p>
        ) : (
          <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs">
            {log.map((e, i) => (
              <li key={i} className="border-b py-1 last:border-0">
                <span className="text-slate-400">{e.t}</span> ·{" "}
                <span className="font-semibold">{e.actor}</span> — {e.action}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-slate-400">
        Approver flips DENY→ALLOW by granting BLACKWING. Security Officer flips
        ALLOW→DENY with a hold (override). Manager can only request. Admin /
        Sponsor / Subject have no decision authority at all.
      </p>
    </div>
  );
}
