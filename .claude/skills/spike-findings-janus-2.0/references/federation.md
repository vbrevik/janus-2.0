# Federation: Hub Discovery + Inter-Entity Handshake

## Requirements
- **Hub stores pointers only** — who-holds-what about a subject, in which domain. NO clearance, tiers, compartments, or decisions.
- Detail crosses entities **only via the handshake**, and the holder runs **its own ABAC policy** before releasing.
- "Discovery without disclosure" is the core property: a pointer being visible must NOT imply the content is.

## How to Build It
1. **Hub index** (`sources/code/lib/data.ts` → `HUB_INDEX`): array of `{ subjectId, holdingEntity, domain }`. That's the entire schema — deliberately no payload.
2. **Discovery UI** (`sources/code/components/Spike002Hub.tsx`): filter `HUB_INDEX` by subject; list holding entities + domains; show an explicit "what the hub does NOT store" panel so the boundary is legible.
3. **Handshake** (`sources/code/components/Spike003Handshake.tsx`):
   - Requester = `{ entity, clearance, compartments }`. Target subject chosen; hub shows holders.
   - On "Request detail" from a holder: build the release requirement with `releaseRequirementFor(target, holder)` (sensitivity = target's own clearance + compartments, owner = holder), then `evaluate(requester, requirement)`.
   - If the **target record** itself is revoked / on hold, append a deny override and force DENY (a record can't be released even if the requester clears).
   - ALLOW → reveal the record; DENY → "pointer was visible, content was not" + the traced reasons.

## What to Avoid
- **Putting any sensitive field in the hub** — defeats the entire privacy model. If you find yourself wanting clearance/compartments in the hub, that belongs at the entity, reached via handshake.
- **Treating cross-entity agreement as sufficient** — affiliation is necessary but not sufficient; requester clearance + need-to-know still apply at release time.
- **Building the hub without the handshake** — the hub alone is a thin directory; its value only materializes through 003.

## Constraints
- The wire contract (publish-pointer / discover / request-detail) and identity federation are NOT yet designed — AUTH-MODEL open questions #2 and #4. This blueprint proves the *flow*, not the protocol.
- Demo simulates entities in-process; a real build needs an actual transport + per-entity policy authorship (open question #5).

## Hardening: typed contract (005) + attribute trust (006)
- **Contract (005, `sources/code/lib/contract.ts`):** entities exchange ONLY via typed envelopes
  (`PUBLISH / DISCOVER / DISCOVER_RESULT / REQUEST_DETAIL / DETAIL_RESPONSE`) routed by a `Network`
  that records a transcript. No direct cross-entity calls. This is the concrete shape of "the interface
  others conform to". A real build swaps the in-process `Network` for a transport but keeps the envelopes.
- **Trust (006, `sources/code/lib/credential.ts`):** the requester's attributes ride in a SIGNED
  credential (HMAC-SHA256 via Web Crypto). The holder runs `verifyCredential` (signature + trusted-issuer
  allowlist) BEFORE any ABAC evaluation. **Never evaluate ABAC on unverified claims.** Demo uses symmetric
  HMAC + a mock key registry; a real build uses asymmetric/verifiable credentials + real key distribution.

## Origin
Synthesized from spikes: 002, 003, 005, 006 (use the 001 engine).
Source files: `sources/code/lib/contract.ts`, `credential.ts`, `sources/code/components/Spike002Hub.tsx`, `Spike003Handshake.tsx`, `Spike005Contract.tsx`, `Spike006Trust.tsx`, `sources/00{2,3,5,6}-*/`.
