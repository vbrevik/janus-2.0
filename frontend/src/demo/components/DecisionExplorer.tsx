// demo/components/DecisionExplorer.tsx — the single Decision Explorer view.
// Fuses the spike ABAC picker (live useMemo trace) with the spike SoD panel (op-gated
// actions + append-only log) into ONE screen reading from / dispatching to the shared store.
// The decision is DERIVED via useMemo, NEVER stored (R2). Actions are gated PURELY by op
// membership (ROLES[currentRole].ops.includes), never by the role identity (R8).
import { useMemo } from "react";
import {
  ROLES,
  unitName,
  type Compartment,
  type Domain,
  type Op,
  type UnitId,
} from "../lib/model";
import {
  evaluate,
  principalFromSubject,
  requirementFromResource,
} from "../lib/abac";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { Card, DecisionTrace, Field, MockTag, Pill, Select } from "./ui";

const SELECT_CLASS = "mt-1 w-full rounded border border-slate-300 p-2 text-sm";

// Verbatim UI-SPEC copy (single-line constants so the locked strings stay greppable
// and the formatter can't split them across source lines).
const SOD_EMPTY =
  "This role holds no access-decision authority — separation of duties.";
const LOG_EMPTY =
  "No actions yet. Auditor sees this log read-only; it is the system of record under pure-ABAC.";

const DOMAIN_OPTIONS: { value: Domain; label: string }[] = [
  { value: "COMPUTER", label: "Computer" },
  { value: "DATA", label: "Data" },
  { value: "PHYSICAL", label: "Physical" },
];

function groupByUnit<T>(
  items: T[],
  unitOf: (item: T) => UnitId,
): [UnitId, T[]][] {
  const groups = new Map<UnitId, T[]>();
  for (const item of items) {
    const unit = unitOf(item);
    const bucket = groups.get(unit);
    if (bucket) bucket.push(item);
    else groups.set(unit, [item]);
  }
  return [...groups.entries()];
}

function captionFor(
  failed: string[],
  hasOverride: boolean,
  domain: Domain,
  allow: boolean,
): string {
  if (allow)
    return "All base rules pass and no deny override is active — access is allowed.";
  if (failed.includes("Domain tier") && !failed.includes("Clearance"))
    return `Clearance passes but the ${domain} tier is too low — per-domain tiers evaluate independently.`;
  if (hasOverride)
    return "A deny override is active — it forces DENY regardless of the base rules.";
  if (failed.includes("Need-to-know"))
    return "A required compartment is missing — need-to-know is not satisfied.";
  if (failed.includes("Affiliation"))
    return "No agreement links the subject's unit to the resource owner — affiliation fails.";
  if (failed.includes("Clearance"))
    return "The subject's clearance is below the resource's minimum — clearance fails.";
  return `Denied on: ${failed.join(", ")}.`;
}

export function DecisionExplorer() {
  const { subjects, resources, events, currentRole, abacTarget } = useWorld();
  const dispatch = useWorldDispatch();

  const subject = subjects.find((s) => s.id === abacTarget.subjectId);
  const resource = resources.find((r) => r.id === abacTarget.resourceId);

  // Decision is DERIVED here (R2). Memo keyed on the store-provided refs — the reducer
  // hands back NEW subject refs on mutation, which is what invalidates this memo.
  const result = useMemo(
    () =>
      subject && resource
        ? evaluate(
            principalFromSubject(subject),
            requirementFromResource(resource),
          )
        : null,
    [subject, resource],
  );

  if (!subject || !resource || !result) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Selection unavailable — this subject/resource is not in the seeded
        world-state.
      </div>
    );
  }

  // Op-gating: availability depends ONLY on the active role's op set (R8).
  const can = (op: Op) => ROLES[currentRole].ops.includes(op);
  const hasViewOp = ROLES[currentRole].ops.some((o) => o.startsWith("view_"));

  const grantComp = resource.requiredCompartments.find(
    (c) => !subject.compartments.includes(c),
  );
  const revokeComp =
    resource.requiredCompartments.find((c) =>
      subject.compartments.includes(c),
    ) ?? subject.compartments[0];
  const onHold = subject.flags.securityHold;

  const subjectGroups = groupByUnit(subjects, (s) => s.unit);
  const resourceGroups = groupByUnit(resources, (r) => r.ownerUnit);

  const noAuthority =
    !can("approve_attribute") && !can("flag_risk") && !can("request_attribute");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The decision is computed live from attributes — there are no stored
        grants. Every rule is traced, so any DENY is explainable down to the
        exact failing attribute. Switch roles above: the policy is identical,
        but the actions a role may take change.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Field label="Subject">
            <select
              className={SELECT_CLASS}
              value={abacTarget.subjectId}
              onChange={(e) =>
                dispatch({ type: "SET_TARGET", subjectId: e.target.value })
              }
            >
              {subjectGroups.map(([unit, subs]) => (
                <optgroup key={unit} label={unitName(unit)}>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <Pill tone="blue">{subject.clearance}</Pill>
            <MockTag />
            <Pill>{unitName(subject.unit)}</Pill>
            {Object.entries(subject.domainAuth).map(([d, t]) => (
              <Pill key={d} tone="amber">
                {d}:{t}
              </Pill>
            ))}
            {subject.compartments.length ? (
              subject.compartments.map((c) => <Pill key={c}>{c}</Pill>)
            ) : (
              <Pill>no compartments</Pill>
            )}
          </div>
        </Card>

        <Card>
          <Field label="Resource">
            <select
              className={SELECT_CLASS}
              value={abacTarget.resourceId}
              onChange={(e) =>
                dispatch({ type: "SET_TARGET", resourceId: e.target.value })
              }
            >
              {resourceGroups.map(([unit, res]) => (
                <optgroup key={unit} label={unitName(unit)}>
                  {res.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.domain})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <div className="mt-3 flex flex-wrap gap-1">
            <Pill tone="blue">needs {resource.minClearance}</Pill>
            <Pill tone="amber">
              {resource.domain}:{resource.requiredTier}
            </Pill>
            <Pill>{unitName(resource.ownerUnit)}</Pill>
            {resource.requiredCompartments.length ? (
              resource.requiredCompartments.map((c) => <Pill key={c}>{c}</Pill>)
            ) : (
              <Pill>no compartment req</Pill>
            )}
          </div>
        </Card>

        <Card>
          <Field label="Domain">
            <Select<Domain>
              value={abacTarget.domain}
              onChange={(domain) => dispatch({ type: "SET_TARGET", domain })}
              options={DOMAIN_OPTIONS}
            />
          </Field>
          <p className="mt-3 text-xs text-slate-400">
            The selected resource carries its own domain &amp; tier; this picker
            scopes the target triple.
          </p>
        </Card>
      </div>

      <DecisionTrace
        result={result}
        prose={captionFor(
          result.failed,
          result.overrides.length > 0,
          resource.domain,
          result.decision === "ALLOW",
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Actions this role may take">
          <div className="space-y-2">
            {can("approve_attribute") && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    grantComp &&
                    dispatch({
                      type: "APPROVE_ATTRIBUTE",
                      subjectId: subject.id,
                      value: grantComp,
                    })
                  }
                  disabled={!grantComp}
                  className="rounded bg-green-700 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  Approve: grant {grantComp ?? "—"}
                </button>
                <button
                  onClick={() =>
                    revokeComp &&
                    dispatch({
                      type: "REVOKE_ATTRIBUTE",
                      subjectId: subject.id,
                      value: revokeComp,
                    })
                  }
                  disabled={!revokeComp}
                  className="rounded bg-amber-700 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  Revoke: remove {revokeComp ?? "—"}
                </button>
              </div>
            )}
            {can("flag_risk") && (
              <button
                onClick={() =>
                  dispatch({
                    type: "TOGGLE_SECURITY_HOLD",
                    subjectId: subject.id,
                  })
                }
                className="rounded bg-red-700 px-3 py-1.5 text-xs text-white"
              >
                {onHold ? "Clear security hold" : "Place security hold"}
              </button>
            )}
            {can("request_attribute") && (
              <button
                onClick={() =>
                  (grantComp ?? subject.compartments[0]) &&
                  dispatch({
                    type: "REQUEST_ATTRIBUTE",
                    subjectId: subject.id,
                    value: (grantComp ??
                      subject.compartments[0]) as Compartment,
                  })
                }
                className="rounded bg-slate-700 px-3 py-1.5 text-xs text-white"
              >
                Request {grantComp ?? "attribute"} (cannot grant)
              </button>
            )}
            {noAuthority && (
              <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">
                {SOD_EMPTY}
                {hasViewOp ? " Read-only visibility only." : ""}
              </p>
            )}
          </div>
        </Card>

        <Card title={`Audit / evaluation log (${events.length})`}>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">{LOG_EMPTY}</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs">
              {[...events].reverse().map((e) => (
                <li key={e.seq} className="border-b py-1 last:border-0">
                  <span className="text-slate-400">#{e.seq}</span> ·{" "}
                  <span className="font-semibold">{e.actor}</span> — {e.op}
                  {e.value ? ` ${e.value}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
