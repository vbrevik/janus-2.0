---
status: partial
phase: 02-federation-hub
source: [02-VERIFICATION.md]
started: 2026-05-22
updated: 2026-05-22
---

## Current Test

[awaiting human testing]

## Tests

### 1. FED-01 — Hub discovery without disclosure
expected: Selecting a subject shows a pointer list of unit + domain only; the "What the hub does NOT store" callout (clearance / tiers / compartments / decision, struck through) is visible; no sensitive fields appear anywhere in the hub panel.
result: [pending]

### 2. FED-02 — Typed-contract exchange transcript
expected: Four stage triggers (Publish / Discover / Request / Respond) are each enabled only on their turn; each appends a typed Envelope to the transcript; "New run" clears the transcript but the Unit Console inbox/outbox history persists.
result: [pending]

### 3. FED-03 — Signed-credential verification (side by side)
expected: Credential Verify panel auto-displays both outcomes — FW-5 ROGUE-ISSUER credential rejected and `[MOCK]`-labelled; valid NATIONAL-CLEARANCE-AUTHORITY credential accepted. `[MOCK]` appears on the rogue card only.
result: [pending]

### 4. FED-04 — Holder-gated release
expected: An ALLOW request releases the record; a DENY request withholds it with a reason; the Unit Console inbox shows the per-rule DecisionTrace for each processed request; outbox shows RELEASED / WITHHELD.
result: [pending]

### 5. [DEMO / MOCK] banner persistence
expected: The non-dismissable [DEMO / MOCK] banner + role switcher header remain visible in BOTH the Decision Explorer and the Federation Hub views (the interim toggle never hides them).
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
