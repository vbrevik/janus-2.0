# Phase 2: Federation Hub - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 02-federation-hub
**Areas discussed:** Exchange state model, Federation view layout, Exchange stepping & transcript, Holder decision & credentials

---

## Exchange state model

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into world-state reducer | Exchange becomes new actions/slices in the existing useReducer store; lift spike logic as PURE helpers. Honors MODEL-02. | ✓ |
| Hybrid: reducer owns data, Network is a pure router | World-state owns data; Network refactored to a stateless function module. | |
| Lift Network class verbatim | Port the spike Network class as-is; fastest but creates a 2nd source of truth MODEL-02 forbids. | |

**User's choice:** Fold into world-state reducer.
**Notes:** User initially asked for help understanding the options; a plain-language explanation was given (this is an internal storage choice, low visible impact, the key tension is single-source-of-truth vs the spike's built-in storage). User then chose the recommended fold-in. Async HMAC plumbing and reducer action shape left to planner discretion.

---

## Federation view layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrolling surface + unit picker | Hub → transcript → verify → ONE unit console at a time via dropdown. Simplest interim, no per-mechanism tabs. | ✓ |
| Console grid (all 6 at once) | Shared hub/exchange controls + 6 tiled consoles; best for watching a request land live, but dense. | |
| Exchange-flow first, consoles secondary | Foreground the stepped exchange; consoles secondary/collapsible. | |

**User's choice:** Single scrolling surface + unit picker (with ASCII preview).
**Notes:** Interim/throwaway — Phase 4 owns the real shell. Carries the spirit of P1's DEMO-01 (no per-mechanism tabs).

---

## Exchange stepping & transcript

| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Next step' button | One button steps a 4-stage state machine. | |
| Four separate stage triggers | Distinct Publish/Discover/Request/Respond buttons, each enabled only on its turn. | ✓ |
| Auto-play with pause/step | Timer-driven with pause + step. | |

**User's choice (stepping):** Four separate stage triggers.

| Option | Description | Selected |
|--------|-------------|----------|
| Per-exchange (resets each run) | Transcript = current run only; clears on new run. | |
| Global accumulating log | All envelopes from all runs append to one growing log. | |
| Per-exchange view + persisted to consoles | Transcript pane shows current run only; request/response persist to holder inbox + requester outbox. | ✓ |

**User's choice (transcript scope):** Per-exchange view + persisted to consoles.
**Notes:** Clean transcript, durable console history — fits the folded-into-reducer decision (inbox/outbox are durable events; active-run transcript is ephemeral).

---

## Holder decision & credentials

| Option | Description | Selected |
|--------|-------------|----------|
| ABAC auto-decides; inbox shows outcome + trace | Holder ABAC computes live; inbox surfaces decision + per-rule trace; no free override. | ✓ |
| Operator clicks Approve/Deny, gated by ABAC | Visible human/SoD step, ABAC still gates; risks implying stored grant. | |
| Operator decides freely (ABAC advisory) | Operator can override ABAC; contradicts pure-computed model. | |

**User's choice (inbox decision):** ABAC auto-decides; inbox shows outcome + trace.

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed set, signed once at load | Deterministic creds (valid per requester + FW-5 rogue), real-HMAC-signed once at load. | ✓ |
| Issued live on each request | Issue+sign on the spot per request; shows full lifecycle. | |
| Dedicated verify panel only (two fixtures) | FED-03 as a standalone two-credential panel; exchange consumes verified claims. | |

**User's choice (credentials):** Fixed set, signed once at load.
**Notes:** FED-03 reject/accept shown side by side per the accepted layout; verify-before-trust still runs in the live exchange.

---

## Claude's Discretion

- Async/crypto plumbing for the async `crypto.subtle` HMAC verify through the synchronous reducer/UI.
- Reducer action shape & state slicing for the new federation slices.
- Exact placement/styling of the throwaway interim toggle.
- Console internal layout (holdings/inbox/outbox arrangement within the single unit console).

## Deferred Ideas

- Scenario presets / curated subject·requester·holder triples for guaranteed-reachable acceptance paths (legibility proper is Phase 4 / gsd-ui-phase).
- Real wire protocol / identity federation / key distribution (AUTH-MODEL open questions; real build only).
- Delete `frontend/src/spikes/` (later cleanup; carried from Phase 1).
- Exchange events feeding audit reconstruction / point-in-time replay (Phase 3).
