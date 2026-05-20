// Spike 008 — per-entity policy authorship. Same subject+resource, evaluated under each entity's
// own policy, side by side — divergence is visible.
import { useState } from "react";
import { SUBJECTS, RESOURCES, type EntityId } from "../lib/data";
import { principalFromSubject, requirementFromResource } from "../lib/abac";
import { evaluateWithPolicy, POLICIES } from "../lib/policy";
import { Card, DecisionTrace, Field, Select } from "./ui";

const ENTITY_IDS: EntityId[] = ["ENTITY_A", "ENTITY_B", "ENTITY_C"];

export function Spike008Policy() {
  const [subjId, setSubjId] = useState(SUBJECTS[0].id);
  const [resId, setResId] = useState(RESOURCES[0].id);

  const principal = principalFromSubject(
    SUBJECTS.find((s) => s.id === subjId)!,
  );
  const req = requirementFromResource(RESOURCES.find((r) => r.id === resId)!);
  const results = ENTITY_IDS.map((id) => ({
    policy: POLICIES[id],
    decision: evaluateWithPolicy(principal, req, POLICIES[id]),
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Each holding entity authors its own release policy — enabling/disabling
        rules or setting a stricter floor. The SAME request can resolve
        differently depending on whose policy runs.
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
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {results.map(({ policy, decision }) => (
          <div key={policy.id} className="space-y-2">
            <div className="text-sm font-semibold">{policy.id}</div>
            <div className="text-xs text-slate-400">{policy.label}</div>
            <DecisionTrace result={decision} />
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Try: Dana Reyes → Classified File Share. ENTITY_A (standard) ALLOW;
        ENTITY_B (TOP_SECRET floor) DENY; ENTITY_C (relaxed lab) ALLOW even
        where need-to-know/affiliation would otherwise block.
      </p>
    </div>
  );
}
