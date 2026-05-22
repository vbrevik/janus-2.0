// ExchangeTranscriptPanel.tsx — FED-02 four-step typed contract exchange. Stage machine: IDLE→PUBLISHED→DISCOVERED→REQUESTED→RESPONDED.
import { useState } from "react";
import {
  unitName,
  UNITS,
  type UnitId,
  type Domain,
  type Envelope,
} from "../lib/model";
import type { Principal } from "../lib/abac";
import { computeDetailResponse } from "../lib/contract";
import { verifyCredential } from "../lib/credential";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { Card, Field, Select } from "./ui";

function envLine(e: Envelope): string {
  switch (e.kind) {
    case "PUBLISH":
      return `PUBLISH  ${unitName(e.from)} → hub: holds ${e.subjectId} (${e.domain})`;
    case "DISCOVER":
      return `DISCOVER ${unitName(e.from)} → hub: who holds ${e.subjectId}?`;
    case "DISCOVER_RESULT":
      return `RESULT   hub → ${unitName(e.to)}: [${e.pointers.map((p) => unitName(p.holder)).join(", ") || "none"}]`;
    case "REQUEST_DETAIL":
      return `REQUEST  ${unitName(e.from)} → ${unitName(e.to)}: detail for ${e.subjectId}`;
    case "DETAIL_RESPONSE":
      return `RESPONSE → ${unitName(e.to)}: ${e.granted ? "RELEASED" : "WITHHELD"}`;
  }
}

export function ExchangeTranscriptPanel() {
  const { fedRunStage, fedTranscript, fedCredentials, subjects } = useWorld();
  const dispatch = useWorldDispatch();

  const [requesterUnit, setRequesterUnit] = useState<UnitId>("MILITARY_1");
  const [holderUnit, setHolderUnit] = useState<UnitId>("MILITARY_2");
  const [subjectId, setSubjId] = useState("subj-2");
  const [domain, setDomain] = useState<Domain>("DATA");
  const [isSending, setIsSending] = useState(false);

  const unitIds = Object.keys(UNITS) as UnitId[];
  const domains: Domain[] = ["COMPUTER", "DATA", "PHYSICAL"];

  async function handleRespond() {
    if (!fedCredentials.valid || isSending) return;
    setIsSending(true);
    try {
      const verifyResult = await verifyCredential(fedCredentials.valid);
      // D2-10: build Principal ONLY if verifyResult.valid === true
      const principal: Principal = verifyResult.valid
        ? {
            entity: fedCredentials.valid.payload.entity,
            clearance: fedCredentials.valid.payload.clearance,
            domainAuth: {},
            compartments: fedCredentials.valid.payload.compartments,
          }
        : {
            entity: requesterUnit,
            clearance: "UNCLASSIFIED",
            compartments: [],
            domainAuth: {},
          };
      const subject = subjects.find((s) => s.id === subjectId);
      const detailResult = computeDetailResponse(
        principal,
        subject,
        holderUnit,
      );
      dispatch({
        type: "FEDERATION_RESPOND",
        verifyResult,
        detailResult,
        requesterUnit,
        holderUnit,
        subjectId,
        requester: principal,
      });
    } finally {
      setIsSending(false);
    }
  }

  const isIdle = fedRunStage === "IDLE";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Exchange Transcript</h2>
      <p className="text-sm text-slate-600">
        Units never call each other directly — every interaction is a typed
        envelope routed through the hub. Step the contract in motion:{" "}
        <strong>PUBLISH &rarr; DISCOVER &rarr; REQUEST &rarr; RESPONSE</strong>.
      </p>

      <Card title="Exchange parameters">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Requester unit">
            <Select
              value={requesterUnit}
              onChange={setRequesterUnit}
              options={unitIds.map((id) => ({
                value: id,
                label: unitName(id),
              }))}
            />
          </Field>
          <Field label="Holder unit">
            <Select
              value={holderUnit}
              onChange={setHolderUnit}
              options={unitIds.map((id) => ({
                value: id,
                label: unitName(id),
              }))}
            />
          </Field>
          <Field label="Subject">
            <Select
              value={subjectId}
              onChange={setSubjId}
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <Field label="Domain">
            <Select
              value={domain}
              onChange={setDomain}
              options={domains.map((d) => ({ value: d, label: d }))}
            />
          </Field>
        </div>
        {!isIdle && (
          <p className="mt-2 text-xs text-slate-400">
            Exchange parameters are locked during a run. Press &ldquo;New
            run&rdquo; to reset.
          </p>
        )}
      </Card>

      <Card title="Stage triggers">
        <div className="flex gap-2 flex-wrap">
          <button
            disabled={fedRunStage !== "IDLE"}
            onClick={() =>
              dispatch({
                type: "FEDERATION_PUBLISH",
                from: requesterUnit,
                subjectId,
                domain,
              })
            }
            className={`rounded px-3 py-1.5 text-sm ${fedRunStage === "IDLE" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-400 disabled:opacity-40"}`}
          >
            Publish
          </button>
          <button
            disabled={fedRunStage !== "PUBLISHED"}
            onClick={() =>
              dispatch({
                type: "FEDERATION_DISCOVER",
                from: requesterUnit,
                subjectId,
              })
            }
            className={`rounded px-3 py-1.5 text-sm ${fedRunStage === "PUBLISHED" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-400 disabled:opacity-40"}`}
          >
            Discover
          </button>
          <button
            disabled={fedRunStage !== "DISCOVERED"}
            onClick={() =>
              dispatch({
                type: "FEDERATION_REQUEST_DETAIL",
                from: requesterUnit,
                to: holderUnit,
                subjectId,
                requester: {
                  entity: requesterUnit,
                  clearance: "UNCLASSIFIED",
                  compartments: [],
                  domainAuth: {},
                },
              })
            }
            className={`rounded px-3 py-1.5 text-sm ${fedRunStage === "DISCOVERED" ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-400 disabled:opacity-40"}`}
          >
            Request detail
          </button>
          <button
            disabled={fedRunStage !== "REQUESTED" || isSending}
            onClick={handleRespond}
            className={`rounded px-3 py-1.5 text-sm ${fedRunStage === "REQUESTED" && !isSending ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-400 disabled:opacity-40"}`}
          >
            {isSending ? "Verifying…" : "Respond"}
          </button>
          {fedRunStage === "RESPONDED" && (
            <button
              onClick={() => dispatch({ type: "FEDERATION_RESET" })}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
            >
              New run
            </button>
          )}
        </div>
      </Card>

      <Card title="Transcript (typed envelopes)">
        {fedTranscript.length === 0 ? (
          <p className="text-sm text-slate-400">
            No exchange yet. Press <strong>Publish</strong> to start a run.
          </p>
        ) : (
          <ul className="space-y-0.5 font-mono text-xs">
            {fedTranscript.map((e, i) => (
              <li key={i} className="text-slate-600">
                {envLine(e)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
