---
spike: 005
name: interchange-contract
type: frontier
validates: "Given two entities, when they exchange only via a typed publish/discover/request-detail contract, then discovery + gated release work end-to-end through it"
verdict: VALIDATED
related: [002, 003]
tags: [federation, contract]
---

# Spike 005: Interchange contract

## What This Validates
Entities communicate ONLY through typed envelopes (`PUBLISH / DISCOVER / DISCOVER_RESULT / REQUEST_DETAIL / DETAIL_RESPONSE`) routed by a `Network` — no direct cross-entity function calls. Proves the "interface others conform to" (AUTH-MODEL Q#2).

## How to Run
- UI: `npm run dev`, `/spikes.html`, tab **005 · Contract**.
- Logic: `npx vitest run src/spikes/lib/contract.test.ts` (4 tests).

## What to Expect
Configure a requester + target + holder, "Send request" → the transcript shows the full message sequence; release/withhold decision rendered; released record shown only on ALLOW.

## Investigation Trail
- Modeled `Network` holding per-entity record maps (derived from `HUB_INDEX`) + a `transcript`. `requestDetail` looks up the holder's record, runs the 001 engine via `releaseRequirementFor`, applies the target-record hold override.

## Results
**VALIDATED** (4/4 tests + UI). The contract carries discovery and gated release end-to-end. The transcript makes the protocol legible — a real building block for "entities conform to this interface."

**Signal:** this is in-process. A real build needs the same envelopes over an actual transport + the trust layer from 006 (the contract carries *claims*; 006 makes them *verifiable*).
