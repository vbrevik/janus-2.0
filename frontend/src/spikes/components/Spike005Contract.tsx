// Spike 005 — entities exchange ONLY via the typed contract; show the message transcript.
import { useState } from "react";
import {
  SUBJECTS,
  ENTITIES,
  entityName,
  type Clearance,
  type Compartment,
  type EntityId,
} from "../lib/data";
import { Network, type DetailResult, type Envelope } from "../lib/contract";
import { Card, DecisionTrace, Field, Pill, Select } from "./ui";

const CLEARANCES: Clearance[] = [
  "UNCLASSIFIED",
  "CONFIDENTIAL",
  "SECRET",
  "TOP_SECRET",
];
const COMPARTMENTS: Compartment[] = ["AURORA", "BLACKWING", "CITADEL"];

function envLine(e: Envelope): string {
  switch (e.kind) {
    case "PUBLISH":
      return `PUBLISH  ${e.from} → hub: holds ${e.subjectId} (${e.domain})`;
    case "DISCOVER":
      return `DISCOVER ${e.from} → hub: who holds ${e.subjectId}?`;
    case "DISCOVER_RESULT":
      return `RESULT   hub → ${e.to}: [${e.pointers.map((p) => p.holder).join(", ") || "none"}]`;
    case "REQUEST_DETAIL":
      return `REQUEST  ${e.from} → ${e.to}: detail for ${e.subjectId}`;
    case "DETAIL_RESPONSE":
      return `RESPONSE → ${e.to}: ${e.granted ? "RELEASED" : "WITHHELD"}`;
  }
}

export function Spike005Contract() {
  const [reqEntity, setReqEntity] = useState<EntityId>("ENTITY_A");
  const [clearance, setClearance] = useState<Clearance>("TOP_SECRET");
  const [comps, setComps] = useState<Compartment[]>(["AURORA", "BLACKWING"]);
  const [targetId, setTargetId] = useState("subj-2");
  const [holder, setHolder] = useState<EntityId>("ENTITY_B");
  const [run, setRun] = useState<{
    transcript: Envelope[];
    result: DetailResult;
  } | null>(null);

  function send() {
    const net = new Network();
    net.publishAll();
    net.discover(reqEntity, targetId);
    const result = net.requestDetail(reqEntity, holder, targetId, {
      entity: reqEntity,
      clearance,
      domainAuth: {},
      compartments: comps,
    });
    setRun({ transcript: net.transcript, result });
  }
  function toggle(c: Compartment) {
    setComps((cur) =>
      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The two entities never call each other directly — every interaction is a
        typed envelope routed through the network. The transcript below is the
        contract in motion:{" "}
        <strong>PUBLISH → DISCOVER → REQUEST → RESPONSE</strong>.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Requesting entity">
          <div className="space-y-3">
            <Field label="From">
              <Select
                value={reqEntity}
                onChange={setReqEntity}
                options={Object.values(ENTITIES).map((e) => ({
                  value: e.id,
                  label: e.name,
                }))}
              />
            </Field>
            <Field label="Clearance">
              <Select
                value={clearance}
                onChange={setClearance}
                options={CLEARANCES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Compartments
              </span>
              <div className="mt-1 flex gap-2">
                {COMPARTMENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggle(c)}
                    className={`rounded border px-2 py-1 text-xs ${comps.includes(c) ? "border-blue-300 bg-blue-100 text-blue-800" : "border-slate-300 text-slate-500"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <Card title="Request">
          <div className="space-y-3">
            <Field label="Subject">
              <Select
                value={targetId}
                onChange={setTargetId}
                options={SUBJECTS.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
            <Field label="Ask holder">
              <Select
                value={holder}
                onChange={setHolder}
                options={Object.values(ENTITIES).map((e) => ({
                  value: e.id,
                  label: e.name,
                }))}
              />
            </Field>
            <button
              onClick={send}
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white"
            >
              Send request over the contract
            </button>
          </div>
        </Card>
      </div>

      {run && (
        <>
          <Card title="Transcript (typed envelopes)">
            <ul className="space-y-0.5 font-mono text-xs">
              {run.transcript.map((e, i) => (
                <li key={i} className="text-slate-600">
                  {envLine(e)}
                </li>
              ))}
            </ul>
          </Card>
          {run.result.decision ? (
            <DecisionTrace result={run.result.decision} />
          ) : (
            <Card>
              <p className="text-sm text-slate-500">
                Holder does not hold this subject — nothing to release.
              </p>
            </Card>
          )}
          {run.result.granted && run.result.record && (
            <Card title="Released record">
              <div className="flex flex-wrap gap-1">
                <Pill tone="blue">{run.result.record.clearance}</Pill>
                {run.result.record.compartments.map((c) => (
                  <Pill key={c}>{c}</Pill>
                ))}
                <Pill>{entityName(run.result.record.homeEntity)}</Pill>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
