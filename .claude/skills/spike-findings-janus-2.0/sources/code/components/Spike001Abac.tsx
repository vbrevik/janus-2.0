// Spike 001 — pure-computed ABAC: pick subject + resource, see live decision + explanation.
import { useMemo, useState } from "react";
import { SUBJECTS, RESOURCES, entityName } from "../lib/data";
import {
  evaluate,
  principalFromSubject,
  requirementFromResource,
} from "../lib/abac";
import { Card, DecisionTrace, Field, Pill, Select } from "./ui";

export function Spike001Abac() {
  const [subjId, setSubjId] = useState(SUBJECTS[0].id);
  const [resId, setResId] = useState(RESOURCES[0].id);

  const subject = SUBJECTS.find((s) => s.id === subjId)!;
  const resource = RESOURCES.find((r) => r.id === resId)!;
  const result = useMemo(
    () =>
      evaluate(
        principalFromSubject(subject),
        requirementFromResource(resource),
      ),
    [subject, resource],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The decision is computed live from attributes — there are no stored
        grants. Every rule is traced, so any DENY is explainable down to the
        exact failing attribute.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <Field label="Subject">
            <Select
              value={subjId}
              onChange={setSubjId}
              options={SUBJECTS.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-1">
            <Pill tone="blue">{subject.clearance}</Pill>
            <Pill>{entityName(subject.homeEntity)}</Pill>
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
            <Select
              value={resId}
              onChange={setResId}
              options={RESOURCES.map((r) => ({
                value: r.id,
                label: `${r.name} (${r.domain})`,
              }))}
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-1">
            <Pill tone="blue">needs {resource.minClearance}</Pill>
            <Pill tone="amber">
              {resource.domain}:{resource.requiredTier}
            </Pill>
            <Pill>{entityName(resource.ownerEntity)}</Pill>
            {resource.requiredCompartments.length ? (
              resource.requiredCompartments.map((c) => <Pill key={c}>{c}</Pill>)
            ) : (
              <Pill>no compartment req</Pill>
            )}
          </div>
        </Card>
      </div>

      <DecisionTrace result={result} />

      <p className="text-xs text-slate-400">
        Try: Lee Park → Dev Jump Host (clearance passes but the COMPUTER tier is
        too low — shows per-domain tiers). Dana Reyes → Dev Jump Host
        (everything fits except the cross-entity agreement).
      </p>
    </div>
  );
}
