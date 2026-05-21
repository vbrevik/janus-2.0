# Phase 2: Federation Hub — Specification

**Created:** 2026-05-21
**Ambiguity score:** 0.17 (gate: ≤ 0.20)
**Requirements:** 4 locked

## Goal

The demo gains a Federation surface where a viewer can discover which units hold authorization info about a subject (pointers only, no detail), step through a typed publish→discover→request→response exchange, watch signed-credential verification reject a forged/untrusted issuer and accept a valid one, and confirm that detail release is gated by the holder unit's own ABAC policy — all as in-memory mock, with a per-unit console for each of the 6 units.

## Background

Phase 1 shipped the foundation: a single `useReducer` world-state store (`frontend/src/demo/store/world-state.tsx`), a pure-computed ABAC engine (`frontend/src/demo/lib/abac.ts`), and a single Decision Explorer view at `/demo.html`. The federation **type substrate already exists** but is inert: `model.ts` declares `Envelope`, `Pointer`, `HubPointer`, `AttrClaims`, and `Credential` as forward type stubs (functions intentionally left in `spikes/`), and `seed.ts` seeds `HUB_INDEX` (pointer index), `AGREEMENTS` (cross-unit), and the FW-5 rogue-issuer credential fixture (`clearanceGrantedBy: "ROGUE-ISSUER"`) explicitly "for Phase 2 credential verification."

Proven references to lift/adapt: `spikes/lib/contract.ts` (Envelope/Pointer/DetailResult), `spikes/lib/credential.ts` (HMAC sign/verify, `ISSUER_KEYS`, `TRUSTED_ISSUERS`), and spike components `Spike002Hub`, `Spike003Handshake`, `Spike005Contract`, `Spike006Trust`. No federation behavior is wired into the demo yet: there is no hub-discovery view, no exchange-transcript view, no credential-verification function in `demo/lib`, no holder-gated release flow, and no per-entity consoles. Phase 1's DEMO-01 forbade per-mechanism tabs and D-09 mandated a single view; Phase 4 owns the coherent shell, so Phase 2 introduces a **throwaway interim view switch** to reach the new Federation surface alongside the Decision Explorer.

## Requirements

1. **FED-01 — Discovery without disclosure (pointer hub)**: The viewer queries the hub for a subject and sees which units hold authz info about them, in which domains, with an explicit "what the hub does NOT store" callout — and zero detail (no clearance, tier, compartments, or decision).
   - Current: `HUB_INDEX` pointers are seeded in `seed.ts` but nothing reads/renders them; no hub view exists.
   - Target: A Federation view renders, for a chosen subject, the list of `HubPointer`s (holdingUnit + domain) plus a visible statement of what the hub deliberately omits.
   - Acceptance: Selecting a seeded subject shows ≥1 pointer with holding unit + domain and NO sensitive attribute/decision; the "hub does not store …" callout is present on screen.

2. **FED-02 — Typed-contract exchange with interactive transcript**: Inter-unit exchange runs over the typed `Envelope` contract and the viewer steps through publish → discover → request → response, seeing each typed message and the resulting decision.
   - Current: `Envelope`/`Pointer` are type stubs in `model.ts`; exchange logic lives only in `spikes/lib/contract.ts`, unused by the demo.
   - Target: An interactive transcript where the viewer triggers each of the 4 stages and the corresponding typed envelope is appended/rendered, ending in a DETAIL_RESPONSE that carries either the record (ALLOW) or null (DENY).
   - Acceptance: Viewer can advance through all 4 stages for a chosen subject/requester; each stage renders its typed envelope kind; the final response reflects the holder's decision.

3. **FED-03 — Signed-credential verification (reject forged, accept valid)**: A requester's attributes ride in a signed `Credential` the holder verifies before trusting; a forged/untrusted-issuer credential is rejected and labelled `[MOCK]`, and a valid trusted-issuer credential passes and unlocks evaluation — both paths shown side by side.
   - Current: `Credential`/`AttrClaims` are type stubs; verify logic + `TRUSTED_ISSUERS` live in `spikes/lib/credential.ts`; the FW-5 rogue fixture is seeded but unused.
   - Target: A verification surface that runs the (mock HMAC) verify on both the FW-5 ROGUE-ISSUER credential (→ rejected, `[MOCK]`/untrusted label) and a valid NATIONAL-CLEARANCE-AUTHORITY credential (→ accepted, evaluation proceeds).
   - Acceptance: The forged/untrusted credential is visibly rejected and labelled; the valid credential visibly passes and enables the downstream decision; both outcomes are demonstrable on screen.

4. **FED-04 — Holder-gated detail release**: Discovery does not imply disclosure — a requester who discovers a pointer cannot read the held detail until the holder unit's own ABAC policy authorizes release for that requester.
   - Current: No release gating exists; `releaseRequirementFor` exists only in spike `abac.ts`.
   - Target: A REQUEST_DETAIL → DETAIL_RESPONSE flow where the holder evaluates the requester via ABAC; ALLOW returns the record, DENY withholds it with an explainable reason; the per-unit console inbox is where a holder sees/decides incoming requests.
   - Acceptance: For a requester the holder's policy denies, the pointer is visible but the detail stays withheld with a reason; for an authorized requester, the same flow returns the record.

## Boundaries

**In scope:**
- A new **Federation Hub view** in the demo island (`frontend/src/demo/`), reachable via a minimal **interim view switch** alongside the existing Decision Explorer.
- Hub discovery panel (FED-01): subject → pointer list + "what the hub does NOT store" callout.
- Interactive typed-exchange transcript (FED-02): viewer-stepped publish→discover→request→response over the `Envelope` contract.
- Signed-credential verification (FED-03): both reject (FW-5 rogue) and accept (valid issuer) paths, `[MOCK]` labelling.
- Holder-gated release (FED-04): REQUEST_DETAIL/DETAIL_RESPONSE gated by the holder unit's ABAC.
- **Per-entity consoles for all 6 units**, each showing: holdings it publishes (pointers) + an **inbox** of incoming detail-requests it approves/denies via its ABAC + an **outbox** of requests it has sent and their results.
- Lifting/adapting the spike federation libs (`contract.ts`, `credential.ts`) into `demo/lib/` and rendering against the existing 6-unit `model.ts`/`seed.ts` substrate.

**Out of scope:**
- **Real backend / network** (Rust/HTTP/WebSocket federation) — locked project decision: the demo is frontend-mock-first; the hub + exchange are in-memory mock.
- **Real PKI / cryptography** — credential signatures use the spike's in-repo HMAC + mock issuer keys; verification is demonstrated, not production-grade (user-confirmed).
- **Audit reconstruction / point-in-time replay** (AUDIT-*) — Phase 3, even though the exchange may append events.
- **Coherent shell + navigation/legibility polish** — Phase 4; Phase 2's interim view switch is throwaway and is not the final navigation.
- **Leak/anomaly detection** (industry scenario) — deferred/stretch.

## Constraints

- Frontend-only, in-memory, demo-island isolated: no router import (`@tanstack/react-router` / generated route tree), no new backend, served via `demo.html` (carries over D-02/R5 from Phase 1).
- Reuse the single Phase 1 world-state store (MODEL-02) and the existing `model.ts`/`seed.ts` substrate; do not fork a second source of truth.
- Credential crypto is the spike's mock HMAC over canonical payload with in-repo `ISSUER_KEYS`/`TRUSTED_ISSUERS` — no real keys.
- No new state-management or crypto dependencies; lift from `spikes/lib/` (verbatim where feasible, like Phase 1 did with `abac.ts`).
- Every simulated/external trust signal stays `[MOCK]`-labelled; the non-dismissable `[DEMO / MOCK]` banner remains on every screen (MODEL-03).

## Acceptance Criteria

- [ ] The Federation view is reachable from the demo island via an interim switch, with the `[DEMO / MOCK]` banner still present.
- [ ] FED-01: hub query for a subject shows pointer(s) (holding unit + domain) with NO detail, plus an explicit "hub does not store …" callout.
- [ ] FED-02: viewer can step through all four exchange stages (publish → discover → request → response) and see each typed `Envelope`.
- [ ] FED-03: the FW-5 ROGUE-ISSUER credential is rejected and labelled `[MOCK]`/untrusted; a valid trusted-issuer credential passes verification — both visible.
- [ ] FED-04: a holder-denied requester sees the pointer but the detail is withheld with a reason; an authorized requester receives the record via the same flow.
- [ ] Each of the 6 units has a console showing its published holdings, an inbox of incoming requests (approve/deny via its ABAC), and an outbox of sent requests + results.
- [ ] No file under `frontend/src/demo/` imports the app router or generated route tree; no new runtime dependency added.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                              |
|--------------------|-------|------|--------|----------------------------------------------------|
| Goal Clarity       | 0.88  | 0.75 | ✓      | 4 FED reqs + 4 success criteria + locked surface   |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Explicit in/out scope; 6 consoles; interim switch  |
| Constraint Clarity | 0.72  | 0.65 | ✓      | Mock-first, mock crypto, lift-from-spikes, no deps |
| Acceptance Criteria| 0.82  | 0.70 | ✓      | 7 pass/fail criteria, one per FED + console + iso  |
| **Ambiguity**      | 0.17  | ≤0.20| ✓      |                                                    |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective     | Question summary                          | Decision locked                                                       |
|-------|-----------------|-------------------------------------------|----------------------------------------------------------------------|
| 1     | Researcher      | How does federation appear in the demo?   | New Federation view + throwaway interim switch (Phase 4 owns shell)   |
| 1     | Researcher      | Are per-entity consoles in scope?         | Yes — full per-entity consoles for all 6 units                       |
| 1     | Simplifier      | What makes FED-02 met?                     | Interactive step-through of publish→discover→request→response         |
| 2     | Boundary Keeper | What's explicitly out of scope?           | Real backend (locked), real PKI/crypto (confirmed), audit→P3, shell→P4|
| 2     | Boundary Keeper | What must each console show?               | Holdings + request inbox (approve/deny via ABAC) + outbox + results   |
| 2     | Failure Analyst | What proves FED-03 verification?          | Reject FW-5 rogue ([MOCK]) AND accept valid issuer — side by side     |

---

*Phase: 02-federation-hub*
*Spec created: 2026-05-21*
*Next step: /gsd:discuss-phase 2 — implementation decisions (how to build what's specified above)*
