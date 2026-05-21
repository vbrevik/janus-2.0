// Spike 006 — attribute trust. Issue a signed credential, optionally forge it, then have the
// holder verify BEFORE trusting. Real HMAC-SHA256 via Web Crypto.
import { useState } from "react";
import type { Clearance, Compartment } from "../lib/data";
import {
  issueCredential,
  verifyCredential,
  ISSUER_KEYS,
  type Credential,
  type VerifyResult,
} from "../lib/credential";
import { Card, Field, Pill, Select } from "./ui";

const CLEARANCES: Clearance[] = ["CONFIDENTIAL", "SECRET", "TOP_SECRET"];

export function Spike006Trust() {
  const [issuer, setIssuer] = useState("NATIONAL-CLEARANCE-AUTHORITY");
  const [clearance, setClearance] = useState<Clearance>("SECRET");
  const [comps] = useState<Compartment[]>(["AURORA"]);
  const [cred, setCred] = useState<Credential | null>(null);
  const [forged, setForged] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function issue() {
    const key = ISSUER_KEYS[issuer];
    const c = await issueCredential(
      {
        subject: "requesting-officer",
        entity: "ENTITY_A",
        clearance,
        compartments: comps,
        issuer,
      },
      key,
    );
    setCred(c);
    setForged(false);
    setResult(null);
  }
  function forge() {
    if (!cred) return;
    setCred({ ...cred, payload: { ...cred.payload, clearance: "TOP_SECRET" } }); // escalate, keep old sig
    setForged(true);
    setResult(null);
  }
  async function verify() {
    if (!cred) return;
    setResult(await verifyCredential(cred));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The handshake (003/005) trusted self-asserted attributes. Here the
        requester carries a <strong>signed credential</strong>; the holder
        verifies the signature and issuer before believing any claim. Forge the
        payload and watch verification fail.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Issuer (clearance authority)">
          <div className="space-y-3">
            <Field label="Issued by">
              <Select
                value={issuer}
                onChange={setIssuer}
                options={[
                  {
                    value: "NATIONAL-CLEARANCE-AUTHORITY",
                    label: "National Clearance Authority (trusted)",
                  },
                  { value: "ROGUE-ISSUER", label: "Rogue Issuer (untrusted)" },
                ]}
              />
            </Field>
            <Field label="Clearance to certify">
              <Select
                value={clearance}
                onChange={setClearance}
                options={CLEARANCES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <button
              onClick={issue}
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white"
            >
              Issue &amp; sign credential
            </button>
          </div>
        </Card>

        <Card title="Credential">
          {!cred ? (
            <p className="text-sm text-slate-400">No credential issued yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                <Pill tone={forged ? "red" : "blue"}>
                  {cred.payload.clearance}
                  {forged ? " (forged)" : ""}
                </Pill>
                {cred.payload.compartments.map((c) => (
                  <Pill key={c}>{c}</Pill>
                ))}
                <Pill>{cred.payload.issuer}</Pill>
              </div>
              <div className="break-all font-mono text-xs text-slate-400">
                sig: {cred.sig.slice(0, 44)}…
              </div>
              <div className="flex gap-2">
                <button
                  onClick={forge}
                  className="rounded bg-red-700 px-3 py-1.5 text-xs text-white"
                >
                  Forge: escalate to TOP_SECRET
                </button>
                <button
                  onClick={verify}
                  className="rounded bg-green-700 px-3 py-1.5 text-xs text-white"
                >
                  Verify at holder
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-4 ${result.valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          <div className="font-bold">
            {result.valid ? "✓ TRUSTED" : "✗ REJECTED"}
          </div>
          <div className="mt-1 text-sm text-slate-600">{result.reason}</div>
          {!result.valid && (
            <div className="mt-1 text-xs text-slate-500">
              The holder will not evaluate ABAC on claims it cannot verify.
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Try: issue from the National Clearance Authority → Verify (TRUSTED).
        Then Forge → Verify (REJECTED, signature mismatch). Or issue from the
        Rogue Issuer → REJECTED (untrusted issuer).
      </p>
    </div>
  );
}
