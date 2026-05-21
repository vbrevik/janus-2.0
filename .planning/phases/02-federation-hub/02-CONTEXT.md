# Phase 2: Federation Hub - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a **Federation surface** to the demo island (`frontend/src/demo/`), reachable via a throwaway interim view switch alongside the existing Decision Explorer. It delivers:

1. **Pointer-hub discovery (FED-01)** — query the hub for a subject, see which units hold authz info and in which domains, with an explicit "what the hub does NOT store" callout and zero detail.
2. **Typed-contract exchange with stepped transcript (FED-02)** — viewer steps publish → discover → request → response over the `Envelope` contract; each typed message renders; the run ends in a DETAIL_RESPONSE carrying the record (ALLOW) or null (DENY).
3. **Signed-credential verification (FED-03)** — holder verifies a presented `Credential` (mock HMAC) before trusting; the FW-5 ROGUE-ISSUER credential is rejected and `[MOCK]`-labelled, a valid NATIONAL-CLEARANCE-AUTHORITY credential passes — both shown side by side.
4. **Holder-gated release (FED-04)** — REQUEST_DETAIL → DETAIL_RESPONSE gated by the holder unit's own ABAC; ALLOW returns the record, DENY withholds with a reason.
5. **Per-unit consoles for all 6 units** — each shows published holdings (pointers) + an inbox of incoming detail-requests + an outbox of sent requests and their results.

All in-memory mock, frontend-only, demo-island isolated (no router, no backend). The `[DEMO / MOCK]` banner stays on every screen.

**Not in this phase:** real backend/network, real PKI/crypto, audit reconstruction/point-in-time replay (Phase 3), the coherent shell + navigation/legibility polish (Phase 4 — the interim switch here is throwaway), leak/anomaly detection (deferred).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**4 requirements are locked.** See `02-SPEC.md` for full requirements (FED-01..FED-04), boundaries, and acceptance criteria.

Downstream agents MUST read `02-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- New Federation Hub view in `frontend/src/demo/`, reachable via a minimal interim view switch alongside the Decision Explorer.
- Hub discovery panel (FED-01): subject → pointer list + "what the hub does NOT store" callout.
- Interactive typed-exchange transcript (FED-02): viewer-stepped publish→discover→request→response over the `Envelope` contract.
- Signed-credential verification (FED-03): both reject (FW-5 rogue) and accept (valid issuer) paths, `[MOCK]` labelling.
- Holder-gated release (FED-04): REQUEST_DETAIL/DETAIL_RESPONSE gated by the holder unit's ABAC.
- Per-entity consoles for all 6 units: holdings + request inbox + outbox + results.
- Lift/adapt the spike federation libs (`contract.ts`, `credential.ts`) into `demo/lib/`, rendering against the existing 6-unit `model.ts`/`seed.ts` substrate.

**Out of scope (from SPEC.md):**
- Real backend/network (Rust/HTTP/WebSocket federation) — locked: in-memory mock only.
- Real PKI/cryptography — credential signatures use the spike's in-repo HMAC + mock issuer keys.
- Audit reconstruction / point-in-time replay (AUDIT-*) — Phase 3.
- Coherent shell + navigation/legibility polish — Phase 4.
- Leak/anomaly detection (industry scenario) — deferred/stretch.

</spec_lock>

<decisions>
## Implementation Decisions

### Exchange State Model
- **D2-01:** **Fold federation exchange state into the single Phase-1 `useReducer` world-state** (`demo/store/world-state.tsx`) as new state slices/actions: published pointers, the active-run transcript, and each unit's request inbox/outbox. Honors MODEL-02 (single source of truth) — consoles read everything from the one store. **Rejected:** lifting the spike `Network` class verbatim, because its internal `transcript`/`pointers`/`records` maps (`spikes/lib/contract.ts:54-68`) create a second source of truth MODEL-02 forbids.
- **D2-02:** **Lift the spike `contract.ts` and `credential.ts` logic as PURE helpers** into `demo/lib/` (e.g. `demo/lib/contract.ts`, `demo/lib/credential.ts`) — the envelope builders, `releaseRequirementFor`/`evaluate` release check, `issueCredential`/`verifyCredential`, `ISSUER_KEYS`/`TRUSTED_ISSUERS`. Re-key to `UnitId` (D-10; the `Envelope`/`Pointer`/`AttrClaims`/`Credential` types already exist in `demo/lib/model.ts:246-291`). Do NOT port the stateful `Network` class — the reducer is the router.

### Federation View Layout
- **D2-03:** **Single scrolling Federation surface** organized top→bottom: Hub Discovery → Exchange Transcript → Credential Verify (side-by-side reject/accept) → Unit Console (one unit at a time via a dropdown picker). Low density, no per-mechanism tabs (carries the spirit of P1's DEMO-01). The viewer-accepted layout sketch is the reference shape.
- **D2-04:** **Interim view switch = a simple local toggle** (e.g. `useState` in `DemoRoot`) between the Decision Explorer and the Federation surface, placed in/near the existing persistent header. NOT added to world-state, NOT the router, NOT `routeTree.gen.ts`. Throwaway — Phase 4's shell replaces it.

### Exchange Stepping & Transcript (FED-02)
- **D2-05:** **Four separate stage triggers** (Publish / Discover / Request / Respond), each enabled only when it's that stage's turn (a 4-step state machine). The current stage is highlighted; each trigger appends its typed `Envelope` to the transcript.
- **D2-06:** **Transcript scope = per-exchange pane + persisted to consoles.** The transcript pane shows only the 4 envelopes of the current run (clears on a new run), BUT each REQUEST_DETAIL/DETAIL_RESPONSE also lands permanently in the holder unit's inbox and the requester unit's outbox. Clean transcript, durable console history. Fits D2-01 (inbox/outbox are durable events in the store; the active-run transcript is the ephemeral/derived current view).

### Holder Decision (FED-04)
- **D2-07:** **ABAC auto-decides release; the inbox surfaces the outcome + trace.** On a REQUEST_DETAIL, the holder unit's ABAC computes ALLOW/DENY live (reuse `demo/lib/abac.ts` `evaluate` + `releaseRequirementFor`); the inbox shows the decision with the per-rule `DecisionTrace`, releasing the record (ALLOW) or withholding it with a reason (DENY). **No free human override** — faithful to pure-computed ABAC. **Rejected:** operator-decides-freely (ABAC advisory), which contradicts the no-stored-grants / no-override model.
- **D2-08:** Record-level deny override still forces DENY at release even if the requester clears — mirror the spike rule (`spikes/lib/contract.ts:120-134`): a held/revoked target record cannot be released. Adapt into the pure release helper.

### Credentials (FED-03)
- **D2-09:** **Fixed credential set, signed once at demo load.** A deterministic set — one valid `NATIONAL-CLEARANCE-AUTHORITY`-signed credential per requester unit, plus the seeded FW-5 `ROGUE-ISSUER` fixture (`seed.ts:761-805`, `clearanceGrantedBy: "ROGUE-ISSUER"`). Real-HMAC-signed once at init via the lifted `issueCredential` (the seed stores claims; signatures are computed at app load since signing is async). Reproducible — the accept/reject acceptance paths always work.
- **D2-10:** **Verify-before-trust in the live exchange AND a side-by-side comparison.** The holder runs `verifyCredential` on the presented credential BEFORE any ABAC evaluation (never evaluate ABAC on unverified claims). The dedicated Credential Verify panel (D2-03) demonstrates both outcomes side by side: FW-5 rogue → rejected, `[MOCK]`/untrusted label; valid issuer → accepted, evaluation proceeds.

### Claude's Discretion
- **Async/crypto plumbing:** how the async `crypto.subtle` HMAC verify (`credential.ts`) is surfaced through the otherwise-synchronous reducer/UI (await in the handler, dispatch the result into state) — planner's choice, constrained only by D2-01 (single store) and the spike's real-HMAC approach (locked by SPEC constraints).
- **Reducer action shape & state slicing** for the new federation slices — internal detail, constrained by MODEL-02 + D-05 (frozen schema).
- **Exact placement/styling of the interim toggle** within "in/near the existing header, throwaway."
- **Console internal layout** (how holdings / inbox / outbox are arranged within the single unit console) — keep legible given the rich D-06 seed; Phase 4 owns final polish.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements & design contract
- `.planning/phases/02-federation-hub/02-SPEC.md` — Locked requirements (FED-01..04), boundaries, constraints, acceptance criteria. **MUST read before planning.**
- `.planning/AUTH-MODEL.md` — authoritative model; federation flow, discovery-without-disclosure, typed contract, verify-before-trust, 6-unit scenario (open questions #2/#4/#5 note the wire protocol/identity-federation are demo-proven, not production-designed).
- `.planning/REQUIREMENTS.md` — FED-01..04 rows.
- `.planning/ROADMAP.md` § "Phase 2: Federation Hub" — goal + 4 success criteria; UI hint: yes.
- `.planning/PROJECT.md` — DEMO/MOCK framing; out-of-scope (real backend/PKI/transport).

### Carried-forward decisions (Phase 1)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01/D-02 (lift spike logic verbatim into `demo/`, isolated `demo.html` entry, no router), D-05 (frozen schema — shielding/deployment/policy seeded), D-09 (single Decision Explorer; DEMO-01 forbids per-mechanism tabs), D-10 (UnitId is the single entity-id type), MODEL-02 (single store).

### Proven patterns (spike findings)
- `.claude/skills/spike-findings-janus-2.0/SKILL.md` — index of validated mechanisms.
- `.claude/skills/spike-findings-janus-2.0/references/federation.md` — pointer-hub + holder-gated handshake + typed contract (005) + attribute trust (006) build recipe and "What to Avoid" (never put sensitive fields in the hub; affiliation necessary-not-sufficient; never evaluate ABAC on unverified claims).

### Source code to lift from / build against
- `frontend/src/spikes/lib/contract.ts` — `Envelope`/`Pointer`/`DetailResult`, `discover`/`requestDetail`, record-hold override (lift logic as pure helpers, NOT the `Network` class).
- `frontend/src/spikes/lib/credential.ts` — `issueCredential`/`verifyCredential`, `canonical`, `ISSUER_KEYS`, `TRUSTED_ISSUERS`, `VerifyResult` (lift; re-key to UnitId).
- `frontend/src/demo/lib/model.ts` — already declares `Envelope`/`Pointer`/`AttrClaims`/`Credential`/`HubPointer` (lines 131-291) re-keyed to UnitId; the type substrate is ready.
- `frontend/src/demo/lib/abac.ts` — `evaluate`, `releaseRequirementFor`, `principalFromSubject`, `requirementFromResource`, `hasAgreement` (already present — the release engine).
- `frontend/src/demo/lib/seed.ts` — `HUB_INDEX` (line 127), `AGREEMENTS` (line 13), FW-5 rogue fixture (lines 761-805).
- `frontend/src/demo/store/world-state.tsx` — the single store to extend (D2-01).
- `frontend/src/spikes/components/Spike002Hub.tsx`, `Spike003Handshake.tsx`, `Spike005Contract.tsx`, `Spike006Trust.tsx` — reference UI for hub / handshake / transcript / trust.
- `frontend/src/demo/components/ui.tsx` (`DecisionTrace`) — reuse for the inbox decision trace (D2-07).

### Codebase maps (conventions)
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/STACK.md` — frontend naming/style/stack the demo must match.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Federation type substrate is already in place** (`demo/lib/model.ts:131-291`): `HubPointer`, `Envelope`, `Pointer`, `AttrClaims`, `Credential` declared and re-keyed to `UnitId`. Phase 2 wires behavior to these inert types.
- **Release engine ready** (`demo/lib/abac.ts`): `evaluate` + `releaseRequirementFor` + `hasAgreement` already exist — FED-04 release computes with no engine work.
- **Seed fixtures ready** (`demo/lib/seed.ts`): `HUB_INDEX` pointers, `AGREEMENTS` cross-unit pairs, and the FW-5 `ROGUE-ISSUER` credential fixture seeded "for Phase 2."
- **`DecisionTrace`** (`demo/components/ui.tsx`) — reuse for the inbox ALLOW/DENY trace.
- **Spike federation logic** (`spikes/lib/contract.ts`, `credential.ts`) — proven; lift the pure parts.

### Established Patterns
- **Single `useReducer` world-state, no new libraries** (MODEL-02) — federation state folds in (D2-01); no Redux/Zustand/second store.
- **Lift proven spike logic, don't rebuild** (D-01) — but lift the *pure* logic, not the spike's stateful storage (D2-01/D2-02).
- **Demo-island isolation** (D-02) — `frontend/src/demo/` only, `demo.html` entry, no `@tanstack/react-router` import, no `routeTree.gen.ts` change (acceptance criterion).
- **Pure-computed ABAC, verify-before-trust** — never evaluate ABAC on unverified claims (D2-10); no stored grants; record holds force DENY (D2-08).
- **`[MOCK]` labelling + non-dismissable `[DEMO / MOCK]` banner** on every screen (MODEL-03) — every simulated trust signal (esp. credentials) stays `[MOCK]`.

### Integration Points
- Extend `demo/store/world-state.tsx` with federation slices/actions (the seam every console reads from).
- Mount the Federation surface under `DemoRoot.tsx` behind the interim toggle (D2-04), alongside `DecisionExplorer.tsx`.
- New `demo/lib/contract.ts` + `demo/lib/credential.ts` (lifted) consumed by the reducer + views.
- Credentials signed once at app init (async) — wire into the demo bootstrap (D2-09).

</code_context>

<specifics>
## Specific Ideas

- Accepted layout sketch (the reference shape for D2-03): Hub Discovery (subject → pointers + "hub does NOT store" callout) → Exchange Transcript (four stage triggers + typed envelopes) → Credential Verify (`rogue:[REJECTED MOCK]  valid:[OK]` side by side) → Unit Console (dropdown unit picker; holdings | inbox | outbox).
- Inbox shows the per-rule `DecisionTrace` for each processed request, not just ALLOW/DENY (D2-07) — keeps FED-04 explainable on screen.
- FW-5 rogue is the canonical reject fixture; a valid `NATIONAL-CLEARANCE-AUTHORITY` credential is the canonical accept path.

</specifics>

<deferred>
## Deferred Ideas

- **Scenario presets / curated subject·requester·holder triples for legibility** — raised as a possible "explore more" area; not locked. Planner may seed a couple of guaranteed-reachable demo scenarios so each acceptance path (rogue-reject, valid-accept, holder-deny, holder-allow) is one click away, but legibility polish proper is Phase 4 (`gsd-ui-phase`).
- **Real wire protocol / identity federation / key distribution** — AUTH-MODEL open questions #2/#4/#5; demo proves the flow, not the protocol. Real build only.
- **Delete `frontend/src/spikes/`** — historical reference; cleanup is a later phase (carried from Phase 1 deferred).
- **Exchange events feeding audit reconstruction / point-in-time replay** — the exchange may append events, but AUDIT-* mechanics are Phase 3.

None of these are scope creep — they are explicit downstream-phase handoffs.

</deferred>

---

*Phase: 2-federation-hub*
*Context gathered: 2026-05-21*
