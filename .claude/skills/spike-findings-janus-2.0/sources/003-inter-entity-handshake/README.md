---
spike: 003
name: inter-entity-handshake
type: standard
validates: "Given A discovers via the hub that B holds info on subject X, when A requests detail, then B's ABAC policy releases or withholds based on A's attributes"
verdict: VALIDATED
related: [001, 002]
tags: [federation, abac]
---

# Spike 003: Inter-entity handshake

## What This Validates
The federation flow: discover (hub) → request → the **holder** runs its own ABAC policy over the
requester's attributes → releases the record or withholds it. Composes 001 (engine) + 002 (hub).

## How to Run
`cd frontend && npm run dev`, open `/spikes.html`, tab **003 · Handshake**.

## What to Expect
Pick a requesting officer (entity, clearance, compartments) and a target subject. The hub shows holders.
"Request detail" runs the holder's release policy: ALLOW reveals the record; DENY shows the traced reasons
and "the pointer was visible, the content was not."

## Investigation Trail
- Release sensitivity modeled as the target's own clearance + compartments, gated by a cross-entity
  agreement with the holder (`releaseRequirementFor`).
- Verified withhold path live: Northgate (SECRET, [AURORA]) requesting Sam's record from Helios → DENY
  (clearance < TOP_SECRET, missing BLACKWING), though the A↔B agreement passes. Detail withheld.

## Results
**VALIDATED** — and this is the most compelling part of the model. **"Discovery without disclosure"**
holds: the hub pointer is visible, the payload is policy-gated at the holder. Cross-entity agreement
(affiliation) is a necessary-but-not-sufficient gate; requester clearance + need-to-know still apply.

**Signal / open:** the wire contract (publish-pointer / discover / request-detail) and identity
federation (AUTH-MODEL open questions #2, #4) are the next things to pin down for a real build.
