---
status: complete
phase: 02-federation-hub
source: [02-VERIFICATION.md, 02-HUMAN-UAT.md]
started: 2026-05-22
updated: 2026-05-22
validated_by: in-browser Playwright walkthrough (vite dev, demo.html), user-approved 2026-05-22; evidence in .playwright-mcp/phase2-federation-deny-trace.png + phase2-federation-allow-released.png
---

## Current Test

[testing complete]

## Tests

### 1. FED-01 — Hub discovery without disclosure
expected: Selecting a subject shows a pointer list of holding unit + domain only; the "What the hub does NOT store" callout (clearance / tiers / compartments / decision, struck through) is visible; no sensitive fields appear anywhere in the hub panel.
result: pass

### 2. FED-02 — Typed-contract exchange transcript
expected: Four stage triggers (Publish / Discover / Request detail / Respond) each enabled only on their turn; each appends a typed Envelope to the transcript; "New run" clears the transcript while the Unit Console inbox/outbox history persists.
result: pass

### 3. FED-03 — Signed-credential verification (side by side)
expected: Credential Verify panel auto-displays both outcomes — ROGUE-ISSUER credential rejected and [MOCK]-labelled; NATIONAL-CLEARANCE-AUTHORITY credential accepted. [MOCK] on the rogue card only.
result: pass

### 4. FED-04 — Holder-gated release
expected: An ALLOW request releases the record; a DENY request withholds it with a reason; the Unit Console inbox shows the per-rule DecisionTrace for each processed request; outbox shows RELEASED / WITHHELD.
result: pass

### 5. [DEMO / MOCK] banner persistence
expected: The non-dismissable [DEMO / MOCK] banner + role switcher header remain visible in BOTH the Decision Explorer and the Federation Hub views.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Advisory (UI audit, non-blocking — not UAT failures)

- Holdings / outbox rows do not show the subject identifier (legibility).
- Exchange parameter selects remain editable during a run despite the "locked" message (add `disabled` to the Select).
- Credential-verify verdict lines lack explicit red-700 / green-700.

These are deferred polish items (largely Phase 4 scope); they did not affect any of the 5 expected behaviors above.
