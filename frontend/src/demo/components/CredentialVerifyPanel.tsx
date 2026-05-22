// CredentialVerifyPanel.tsx — FED-03 signed-credential verification. Auto-verifies both credentials on mount (D2-09). Side-by-side rogue-reject and valid-accept.
import { useEffect } from "react";
import { verifyCredential } from "../lib/credential";
import { useWorld, useWorldDispatch } from "../store/world-state";
import { Card, MockTag } from "./ui";

export function CredentialVerifyPanel() {
  const { fedCredentials, fedVerifyResults } = useWorld();
  const dispatch = useWorldDispatch();

  // D2-09: auto-verify both credentials when populated (fired by CREDENTIALS_READY)
  useEffect(() => {
    if (!fedCredentials.valid || !fedCredentials.rogue) return;
    let alive = true;
    Promise.all([
      verifyCredential(fedCredentials.valid),
      verifyCredential(fedCredentials.rogue),
    ]).then(([validResult, rogueResult]) => {
      if (alive)
        dispatch({
          type: "CREDENTIAL_VERIFY_RESULTS",
          validResult,
          rogueResult,
        });
    });
    return () => {
      alive = false;
    };
  }, [fedCredentials.valid, fedCredentials.rogue, dispatch]);

  // Loading: credentials not yet signed or verify results not yet arrived
  if (
    !fedCredentials.valid ||
    !fedVerifyResults.valid ||
    !fedVerifyResults.rogue
  ) {
    return (
      <Card>
        <p className="text-sm text-slate-400">Signing credentials…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Credential Verification</h2>
      <p className="text-sm text-slate-600">
        A requester&apos;s attributes ride in a signed credential the holder
        verifies <strong>before</strong> trusting any claim. A forged or
        untrusted-issuer credential is rejected; a valid trusted-issuer
        credential passes and unlocks evaluation. Both shown side by side.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Left card — rogue (red/REJECTED) */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="font-bold text-xl">&#x2717; REJECTED</div>
          <div className="text-sm text-slate-600">
            {fedVerifyResults.rogue.reason}
          </div>
          <div>
            <MockTag />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            The holder will not evaluate ABAC on claims it cannot verify.
          </div>
        </div>

        {/* Right card — valid (green/TRUSTED) */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <div className="font-bold text-xl">&#x2713; TRUSTED</div>
          <div className="text-sm text-slate-600">
            {fedVerifyResults.valid.reason}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Evaluation proceeds — ABAC will compute release using these verified
            claims.
          </div>
        </div>
      </div>
    </div>
  );
}
