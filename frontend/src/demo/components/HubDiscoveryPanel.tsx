// HubDiscoveryPanel.tsx — FED-01 discovery without disclosure.
// Renders hub pointers for a subject with explicit 'hub does NOT store' callout.
import { useState } from "react";
import { unitName } from "../lib/model";
import { useWorld } from "../store/world-state";
import { Card, Field, Pill, Select } from "./ui";

export function HubDiscoveryPanel() {
  const { subjects, hubIndex } = useWorld();
  const [subjId, setSubjId] = useState(subjects[0]?.id ?? "");

  // FED-01 invariant: only holdingUnit + domain — never clearance/tiers/compartments/decision
  const pointers = hubIndex.filter((p) => p.subjectId === subjId);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Hub Discovery</h2>
      <p className="text-sm text-slate-600">
        The hub answers <em>who knows what</em> — which units hold authorization
        info about a subject, in which domain. It deliberately stores{" "}
        <strong>pointers only</strong>: no clearance, no tiers, no compartments,
        no decisions. Details never leave the holding unit.
      </p>

      <Card>
        <Field label="Look up a subject in the hub">
          <Select
            value={subjId}
            onChange={setSubjId}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Hub index">
          {pointers.length === 0 ? (
            <p className="text-sm text-slate-400">
              No unit has published a pointer for this subject.
            </p>
          ) : (
            <ul className="space-y-2">
              {pointers.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Pill tone="blue">{unitName(p.holdingUnit)}</Pill>
                  <span className="text-slate-400"> holds </span>
                  <Pill tone="amber">{p.domain}</Pill>
                  <span className="text-slate-400"> authz info</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="What the hub does NOT store">
          <ul className="space-y-1.5">
            <li className="text-sm text-slate-500 line-through">
              clearance level
            </li>
            <li className="text-sm text-slate-500 line-through">
              domain tiers
            </li>
            <li className="text-sm text-slate-500 line-through">
              need-to-know compartments
            </li>
            <li className="text-sm text-slate-500 line-through">
              the access decision itself
            </li>
          </ul>
          <p className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-500">
            To learn any of these, a unit must perform an inter-unit request —
            and the holder runs its own ABAC policy before releasing anything.
          </p>
        </Card>
      </div>
    </div>
  );
}
