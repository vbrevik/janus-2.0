// demo/lib/credential.ts — async HMAC credential helpers lifted from spikes/lib/credential.ts. UnitId re-key only (D2-02).
import type { AttrClaims, Credential } from "./model";

// Stable, key-sorted serialization so signing is deterministic.
function canonical(p: AttrClaims): string {
  return JSON.stringify({
    clearance: p.clearance,
    compartments: [...p.compartments].sort(),
    entity: p.entity,
    issuer: p.issuer,
    subject: p.subject,
  });
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: AttrClaims, secret: string): Promise<string> {
  const key = await importKey(secret);
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(canonical(payload)),
  );
  return toBase64(mac);
}

export async function issueCredential(
  payload: AttrClaims,
  issuerSecret: string,
): Promise<Credential> {
  return { payload, sig: await sign(payload, issuerSecret) };
}

// Trusted issuers and their keys (mock key registry). Holder only trusts these.
export const ISSUER_KEYS: Record<string, string> = {
  "NATIONAL-CLEARANCE-AUTHORITY": "nca-demo-secret-key",
  "ROGUE-ISSUER": "rogue-secret", // present so we can show "untrusted issuer" rejection
};
export const TRUSTED_ISSUERS = ["NATIONAL-CLEARANCE-AUTHORITY"];

export interface VerifyResult {
  valid: boolean;
  reason: string;
}

export async function verifyCredential(
  cred: Credential,
): Promise<VerifyResult> {
  const issuer = cred.payload.issuer;
  if (!TRUSTED_ISSUERS.includes(issuer)) {
    return { valid: false, reason: `issuer "${issuer}" is not trusted` };
  }
  const key = ISSUER_KEYS[issuer];
  if (!key)
    return { valid: false, reason: `no key on file for issuer "${issuer}"` };
  const expected = await sign(cred.payload, key);
  if (expected !== cred.sig) {
    return {
      valid: false,
      reason: "signature mismatch — payload tampered or wrong key",
    };
  }
  return { valid: true, reason: `verified signature from ${issuer}` };
}
