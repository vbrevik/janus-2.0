// FederationHub.tsx — top-level federation surface (D2-03). Single scrolling page:
// Hub Discovery → Exchange Transcript → Credential Verify → Unit Console.
import { useEffect, useState } from "react";
import { issueCredential, ISSUER_KEYS } from "../lib/credential";
import { useWorldDispatch } from "../store/world-state";
import { HubDiscoveryPanel } from "./HubDiscoveryPanel";
import { ExchangeTranscriptPanel } from "./ExchangeTranscriptPanel";
import { CredentialVerifyPanel } from "./CredentialVerifyPanel";
export function FederationHub() {
  const dispatch = useWorldDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // D2-09: async credential bootstrap — signed once at mount.
  // cancelled guard prevents double-dispatch in React StrictMode.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [valid, rogue] = await Promise.all([
          issueCredential(
            {
              subject: "subj-1",
              entity: "MILITARY_1",
              clearance: "SECRET",
              compartments: ["AURORA"],
              issuer: "NATIONAL-CLEARANCE-AUTHORITY",
            },
            ISSUER_KEYS["NATIONAL-CLEARANCE-AUTHORITY"],
          ),
          issueCredential(
            {
              subject: "fw5-subj",
              entity: "INDUSTRY",
              clearance: "TOP_SECRET",
              compartments: ["STOCKWATCH"],
              issuer: "ROGUE-ISSUER",
            },
            ISSUER_KEYS["ROGUE-ISSUER"],
          ),
        ]);
        if (!cancelled) {
          dispatch({ type: "CREDENTIALS_READY", valid, rogue });
        }
      } catch {
        if (!cancelled) {
          setErrorMsg(
            "Credential service unavailable — Web Crypto did not respond. This is a demo environment error, not an authorization decision.",
          );
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {errorMsg}
        </div>
      )}
      <HubDiscoveryPanel />
      <ExchangeTranscriptPanel />
      <CredentialVerifyPanel />
    </div>
  );
}
