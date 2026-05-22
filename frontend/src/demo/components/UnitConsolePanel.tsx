// UnitConsolePanel.tsx — FED-04 per-unit console. Holdings, inbox (with DecisionTrace), and outbox sections for the selected unit.
import { useState } from "react";
import { UNITS, unitName, type UnitId } from "../lib/model";
import {
  useWorld,
  type InboxEntry,
  type OutboxEntry,
} from "../store/world-state";
import { Card, Field, Pill, Select, MockTag, DecisionTrace } from "./ui";

export function UnitConsolePanel() {
  const { hubIndex, fedInbox, fedOutbox } = useWorld();
  const unitIds = Object.keys(UNITS) as UnitId[];
  const [selectedUnit, setSelectedUnit] = useState<UnitId>(unitIds[0]);
  // Note: selectedUnit is local state ONLY — does NOT dispatch to the store (D2-04 spirit / Pattern 6)

  const holdings = hubIndex.filter((p) => p.holdingUnit === selectedUnit);
  const inboxEntries: InboxEntry[] = fedInbox[selectedUnit] ?? [];
  const outboxEntries: OutboxEntry[] = fedOutbox[selectedUnit] ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Unit Console</h2>

      <Card>
        <Field label="Unit console">
          <Select<UnitId>
            value={selectedUnit}
            onChange={setSelectedUnit}
            options={unitIds.map((id) => ({ value: id, label: unitName(id) }))}
          />
        </Field>
      </Card>

      <Card title="Holdings (published pointers)">
        {holdings.length === 0 ? (
          <p className="text-sm text-slate-400">
            This unit publishes no pointers.
          </p>
        ) : (
          <ul className="space-y-2">
            {holdings.map((p, i) => (
              <li key={i}>
                <span className="text-sm">
                  <Pill tone="blue">{unitName(p.holdingUnit)}</Pill>
                  <span className="text-slate-400"> holds </span>
                  <Pill tone="amber">{p.domain}</Pill>
                  <span className="text-slate-400"> authz info</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Inbox (incoming detail requests)">
        {inboxEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No incoming requests.</p>
        ) : (
          <div className="space-y-4">
            {inboxEntries.map((entry) => (
              <div
                key={entry.seq}
                className="space-y-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Pill tone="blue">{unitName(entry.from)}</Pill>
                  <span className="text-slate-400">
                    {"→ " + entry.subjectId}
                  </span>
                  {entry.verifyResult.valid ? (
                    <Pill tone="green">verified</Pill>
                  ) : (
                    <>
                      <Pill tone="red">unverified</Pill>
                      <MockTag />
                    </>
                  )}
                </div>
                {entry.detailResult.decision !== null && (
                  <DecisionTrace result={entry.detailResult.decision} />
                )}
                {entry.detailResult.decision?.decision === "DENY" &&
                  !entry.verifyResult.valid && (
                    <p className="text-xs text-slate-500 mt-1">
                      Credential not verified — its claims were discarded and
                      ABAC ran on a downgraded unclassified principal, which
                      denies.
                    </p>
                  )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Outbox (sent requests & results)">
        {outboxEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No sent requests.</p>
        ) : (
          <div className="space-y-2">
            {outboxEntries.map((entry) => (
              <div
                key={entry.seq}
                className="flex flex-wrap items-center gap-2 text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0"
              >
                <Pill tone="blue">{unitName(entry.to)}</Pill>
                <span className="text-slate-400">{entry.subjectId}</span>
                {entry.granted ? (
                  <>
                    <Pill tone="green">RELEASED</Pill>
                    {entry.record && (
                      <>
                        <Pill tone="blue">{entry.record.clearance}</Pill>
                        {entry.record.compartments.map((c) => (
                          <Pill key={c}>{c}</Pill>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <Pill tone="red">WITHHELD</Pill>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
