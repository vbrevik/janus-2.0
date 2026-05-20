---
spike: 002
name: hub-discovery-index
type: standard
validates: "Given 2-3 entities holding authz info about subjects, when published to the hub, then a user can discover who holds info on a subject+domain without seeing details"
verdict: VALIDATED
related: [003]
tags: [hub, federation]
---

# Spike 002: Hub discovery index

## What This Validates
The central hub answers "who knows what" — which entity holds authorization info about a subject, in
which domain — while storing **pointers only** (no clearance, tiers, compartments, or decisions).

## How to Run
`cd frontend && npm run dev`, open `/spikes.html`, tab **002 · Hub index**.

## What to Expect
Selecting a subject lists the entities + domains that hold info about them, beside an explicit panel of
what the hub does NOT store. Details are unreachable from the hub alone.

## Investigation Trail
- Modeled the hub as `HubPointer{subjectId, holdingEntity, domain}` — deliberately omitting any sensitive
  field, to test whether a pointer-only index is coherent.

## Results
**VALIDATED** as a discovery layer. **Signal / what might not work:** the hub alone has limited value —
its usefulness depends entirely on the inter-entity handshake (003) that turns a pointer into (gated)
detail. This confirms AUTH-MODEL open question #1 (hub boundary) is the key design decision: the hub is a
directory, not a data store.
