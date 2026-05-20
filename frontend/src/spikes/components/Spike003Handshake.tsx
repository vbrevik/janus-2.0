// Spike 003 — inter-entity handshake. A discovers via hub, requests detail from holder B,
// B's ABAC policy decides whether to release. Composes the hub (002) + the engine (001).
import { useState } from "react";
import {
  SUBJECTS,
  HUB_INDEX,
  ENTITIES,
  entityName,
  type Clearance,
  type Compartment,
  type EntityId,
} from "../lib/data";
import { evaluate, releaseRequirementFor, type Decision } from "../lib/abac";
import { Card, DecisionTrace, Field, Pill, Select } from "./ui";

const ALL_COMPARTMENTS: Compartment[] = ["AURORA", "BLACKWING", "CITADEL"];
const ALL_CLEARANCES: Clearance[] = [
  "UNCLASSIFIED",
  "CONFIDENTIAL",
  "SECRET",
  "TOP_SECRET",
];

export function Spike003Handshake() {
  const [reqEntity, setReqEntity] = useState<EntityId>("ENTITY_A");
  const [reqClearance, setReqClearance] = useState<Clearance>("SECRET");
  const [reqComp, setReqComp] = useState<Compartment[]>(["AURORA"]);
  const [targetId, setTargetId] = useState("subj-2");
  const [request, setRequest] = useState<{
    holder: EntityId;
    result: Decision;
  } | null>(null);

  const target = SUBJECTS.find((s) => s.id === targetId)!;
  const pointers = HUB_INDEX.filter((p) => p.subjectId === targetId);

  function toggleComp(c: Compartment) {
    setReqComp((cur) =>
      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
    );
    setRequest(null);
  }

  function requestDetail(holder: EntityId) {
    const base = evaluate(
      {
        entity: reqEntity,
        clearance: reqClearance,
        domainAuth: {},
        compartments: reqComp,
      },
      releaseRequirementFor(target, holder),
    );
    // A record on security hold cannot be released even if the requester clears.
    const result: Decision =
      target.flags.securityHold || target.flags.revoked
        ? {
            ...base,
            decision: "DENY",
            overrides: [
              ...base.overrides,
              {
                name: target.flags.revoked ? "Revoked" : "Security hold",
                pass: false,
                detail: `target record is ${target.flags.revoked ? "revoked" : "on security hold"}`,
              },
            ],
          }
        : base;
    setRequest({ holder, result });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Discovery is cheap (the hub). Detail is gated: when a requester asks a
        holder for a subject's record, the holder runs its{" "}
        <strong>own ABAC policy</strong> over the requester's attributes before
        releasing anything.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Requesting officer">
          <div className="space-y-3">
            <Field label="From entity">
              <Select
                value={reqEntity}
                onChange={(v) => {
                  setReqEntity(v);
                  setRequest(null);
                }}
                options={Object.values(ENTITIES).map((e) => ({
                  value: e.id,
                  label: e.name,
                }))}
              />
            </Field>
            <Field label="Clearance">
              <Select
                value={reqClearance}
                onChange={(v) => {
                  setReqClearance(v);
                  setRequest(null);
                }}
                options={ALL_CLEARANCES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Compartments held
              </span>
              <div className="mt-1 flex gap-2">
                {ALL_COMPARTMENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleComp(c)}
                    className={`rounded border px-2 py-1 text-xs ${reqComp.includes(c) ? "border-blue-300 bg-blue-100 text-blue-800" : "border-slate-300 text-slate-500"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Target subject">
          <Field label="Discover record for">
            <Select
              value={targetId}
              onChange={(v) => {
                setTargetId(v);
                setRequest(null);
              }}
              options={SUBJECTS.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <div className="mt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Hub says these entities hold info:
            </span>
            <ul className="mt-2 space-y-2">
              {pointers.length === 0 && (
                <li className="text-sm text-slate-400">
                  No pointers in the hub.
                </li>
              )}
              {pointers.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Pill tone="blue">{entityName(p.holdingEntity)}</Pill>
                    <Pill tone="amber">{p.domain}</Pill>
                  </span>
                  <button
                    onClick={() => requestDetail(p.holdingEntity)}
                    className="rounded bg-slate-800 px-3 py-1 text-xs text-white"
                  >
                    Request detail
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {request && (
        <Card title={`${entityName(request.holder)} evaluates the request`}>
          <DecisionTrace result={request.result} />
          <div className="mt-3">
            {request.result.decision === "ALLOW" ? (
              <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
                <div className="font-semibold text-green-800">
                  Record released:
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Pill tone="blue">{target.clearance}</Pill>
                  {Object.entries(target.domainAuth).map(([d, t]) => (
                    <Pill key={d} tone="amber">
                      {d}:{t}
                    </Pill>
                  ))}
                  {target.compartments.map((c) => (
                    <Pill key={c}>{c}</Pill>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Detail withheld — requester does not satisfy the holder's
                release policy. The hub pointer was visible, the content was
                not.
              </div>
            )}
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        Try: from Northgate (A) with TOP_SECRET + AURORA + BLACKWING, request
        Sam's record from Helios (B) → released (A↔B agreement, requester
        clears). Drop BLACKWING or lower clearance → withheld.
      </p>
    </div>
  );
}
