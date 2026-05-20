// Spike 002 — central hub discovery index: WHO holds WHAT about a subject, WITHOUT details.
import { useState } from "react";
import { SUBJECTS, HUB_INDEX, entityName } from "../lib/data";
import { Card, Field, Pill, Select } from "./ui";

export function Spike002Hub() {
  const [subjId, setSubjId] = useState(SUBJECTS[0].id);
  const subject = SUBJECTS.find((s) => s.id === subjId)!;
  const pointers = HUB_INDEX.filter((p) => p.subjectId === subjId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The hub answers "<em>who knows what</em>" — which entities hold
        authorization info about a subject, in which domain. It deliberately
        stores <strong>pointers only</strong>: no clearance, no tiers, no
        compartments, no decisions. Details never leave the holding entity.
      </p>

      <Card>
        <Field label="Look up a subject in the hub">
          <Select
            value={subjId}
            onChange={setSubjId}
            options={SUBJECTS.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title={`Hub index — ${subject.name}`}>
          {pointers.length === 0 ? (
            <p className="text-sm text-slate-400">
              No entity has published a pointer for this subject.
            </p>
          ) : (
            <ul className="space-y-2">
              {pointers.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Pill tone="blue">{entityName(p.holdingEntity)}</Pill>
                  <span className="text-slate-400">holds</span>
                  <Pill tone="amber">{p.domain}</Pill>
                  <span className="text-slate-400">authz info</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="What the hub does NOT store">
          <ul className="space-y-1.5 text-sm text-slate-500">
            <li className="line-through">clearance level</li>
            <li className="line-through">domain tiers</li>
            <li className="line-through">need-to-know compartments</li>
            <li className="line-through">the access decision itself</li>
          </ul>
          <p className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-500">
            To learn any of these, an entity must perform an inter-entity
            request (spike 003) — and the holder runs its own ABAC policy before
            releasing anything.
          </p>
        </Card>
      </div>
    </div>
  );
}
