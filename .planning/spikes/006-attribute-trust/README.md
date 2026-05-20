---
spike: 006
name: attribute-trust
type: frontier
validates: "Given a requester presents a signed attribute credential, when the holder verifies signature + issuer before trusting, then forged or untrusted-issuer claims are rejected"
verdict: VALIDATED
related: [003, 005]
tags: [trust, federation]
---

# Spike 006: Attribute trust

## What This Validates
The handshake previously trusted self-asserted attributes. Here attributes ride in a **signed credential** (real HMAC-SHA256 via Web Crypto); the holder verifies signature + trusted-issuer BEFORE evaluating ABAC. Closes AUTH-MODEL Q#4.

## How to Run
- UI: `npm run dev`, `/spikes.html`, tab **006 · Attr trust**.
- Logic: `npx vitest run src/spikes/lib/credential.test.ts` (4 tests).

## What to Expect
Issue & sign from the National Clearance Authority → Verify = TRUSTED. Forge (escalate clearance, keep old sig) → Verify = REJECTED (signature mismatch). Issue from the Rogue Issuer → REJECTED (untrusted issuer).

## Investigation Trail
- Canonical (key-sorted) payload serialization so signing is deterministic.
- Mock issuer key registry + `TRUSTED_ISSUERS` allowlist — verification fails both on bad signature AND on untrusted/unknown issuer.
- Verified live in browser: forged TOP_SECRET escalation rejected with "signature mismatch".

## Results
**VALIDATED** (4/4 + live UI). Verify-before-trust is the federation backbone — without it, cross-entity ABAC is "trust me." Tamper and untrusted-issuer are both caught.

**Signal:** the demo uses symmetric HMAC with a mock key registry. A real build would use asymmetric signatures / verifiable credentials + real key distribution (out of scope here; the *flow* is what's proven).
