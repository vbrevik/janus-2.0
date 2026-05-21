# Pitfalls Research

**Domain:** Federated ABAC Authorization Hub — DEMO/MOCK integration of 9 validated spikes
**Researched:** 2026-05-21
**Confidence:** HIGH (derived directly from spike findings, AUTH-MODEL.md, and project constraints)

---

## Critical Pitfalls

### Pitfall 1: Over-engineering toward production — adding real crypto/transport/persistence

**What goes wrong:**
A developer wires up real asymmetric credentials (WebAuthn, real PKI), a real HTTP transport between
"entities", or a PostgreSQL persistence layer for the evaluation log because "it's already there". The
demo accumulates production concerns: key management, TLS, migration scripts, secret rotation. Build
time balloons; the demo never ships.

**Why it happens:**
The brownfield substrate has a real Rocket + Postgres backend, real JWT auth, and real bcrypt — it
*invites* using them. The gap between "spike in `spikes.html`" and "wired to the real API" is small
enough that it feels free. The signed-credential spike (006) used HMAC-SHA256 via Web Crypto, which
looks almost production-grade and tempts a real key-distribution layer.

**How to avoid:**
Treat the demo/mock boundary as a hard constraint, not a style preference. Per AUTH-MODEL §10:
clearance feed = seeded JSON, transport = in-process Network object, persistence = in-memory/seed.
Implement `verifyCredential` with a mock key registry (the spike already does this). Label every
simulated boundary with an explicit `// MOCK: ...` comment naming what a real build would replace.
Never swap an in-process `Network` for a real fetch without a phase gate that explicitly scopes it.

**Warning signs:**
- A PR adds a new backend endpoint to serve federation messages.
- `credential.ts` starts importing a real JWKS URL.
- Database migrations appear for evaluation log tables before the demo is done.
- "Just hooking it to the real API" is spoken without a phase gate.

**Phase to address:**
Phase 1 (foundation / data model) — establish the demo/mock boundary contract in code before any
integration work begins. A `MockNetwork` wrapper and `MockClearanceFeed` must exist before any spike
is wired into the app.

---

### Pitfall 2: The opposite — a mock so hollow it proves nothing

**What goes wrong:**
To avoid over-engineering, the developer swings too far: all ABAC decisions are hardcoded
`return 'ALLOW'`, entity "federation" is just switching a dropdown with no policy evaluation, and the
demo only proves "the UI can show a colored badge." A non-technical viewer cannot distinguish this from
a lookup table with a nice skin. The 9 spikes proved nothing if the demo re-mocks them with stubs.

**Why it happens:**
"It's just a demo" becomes "just fake it" under time pressure. The isolation of spikes behind
`spikes.html` means a developer integrating them into the app rewrites the logic from scratch instead
of lifting the validated spike code, and takes shortcuts.

**How to avoid:**
The spike code is the implementation, not the prototype to be thrown away. When wiring a spike into
the app, lift `abac.ts`, `auditlog.ts`, `policy.ts`, `obligations.ts` from `sources/code/lib/`
directly — do not rewrite them. The ABAC engine must run real conjunctive evaluation with per-domain
tiers, deny overrides, and an explanation trace. The credential path must call `verifyCredential`
(even against a mock registry) — a demo that skips verification doesn't prove the trust model.
Define a "convincing demo" checklist before build starts: what must the evaluator be able to observe
live (not scripted) to accept the mechanism as validated?

**Warning signs:**
- Decision functions return a constant or flip based on a boolean prop.
- The "handshake" flow skips ABAC evaluation and just toggles a state variable.
- `verifyCredential` is bypassed with `if (DEV_MODE) return true`.
- No `DecisionTrace` component is visible in the federation flow.

**Phase to address:**
Phase 1 (foundation) — define the "convincing demo" acceptance criteria. Phase 2 (integration) — each
wired mechanism has a test verifying real spike logic is called, not stubbed.

---

### Pitfall 3: Audit-replay performance trap — replaying the full event log on every query

**What goes wrong:**
`whoCanAccess(requirement, events, asOf)` reconstructs every subject by replaying from event 0 on
every query. With the demo's seeded data this is invisible. If the demo scales to a timeline-slider
interaction (spike 007's real deliverable), the full replay on every slider tick causes visible
jank — ruining the legibility of the audit UI for a live audience.

**Why it happens:**
The spike reference (`audit.md`) already flags this: "Full replay per query won't scale — materialize
a 'current access' projection." But it's easy to defer the projection and ship the naive replay,
especially when seeded data is small and the problem is invisible in development.

**How to avoid:**
Materialize a `currentProjection` map (`subjectId → attributes`) that is incrementally updated as
events are appended. `whoCanAccess` at `asOf = now` hits the projection, not the raw log. The full
replay path (`reconstructSubject` from log) is retained for historical point-in-time queries (the
slider going back in time). For the demo, "now" queries must be O(1) against the projection; slider
queries replay only the subject being inspected, not all subjects.

**Warning signs:**
- Timeline slider causes React profiler frames above 100 ms.
- `whoCanAccess` is called inside a `useMemo` with `events` as a dependency and no derived projection.
- No `currentProjection` state exists alongside the event log.

**Phase to address:**
Phase 2 (audit integration) — build the projection alongside the log from day one; do not defer.

---

### Pitfall 4: Conflating the demo's mock HMAC signature with real credential trust

**What goes wrong:**
A non-technical viewer (or a future engineer) sees a "Verified credential" badge in the demo and
interprets it as real cryptographic trust. The demo uses symmetric HMAC with a mock key registry — if
the issuer key is seeded client-side, anyone can forge a credential. The demo then ships as a
reference, and the next engineer copies the HMAC pattern into a production integration, believing it
provides the stated guarantees.

**Why it happens:**
The UI renders "VERIFIED" in green for a credential that passes the mock check. There is no visible
signal that the verification is demo-grade. The spike (006) validated the *flow*, not the *security
level*. Readers of the code see `verifyCredential(credential, MOCK_KEY_REGISTRY)` and assume the
registry is the only missing piece before production.

**How to avoid:**
Every credential-verification UI must carry an explicit `[MOCK]` label in the demo — not just a
comment in code but visible in the rendered UI. The `MockKeyRegistry` must be named unmistakably
(never `keyRegistry` or `trustedIssuers`). Add a "What this demo simulates vs. what a real build
needs" panel to the federation flow — mirroring the "what the hub does NOT store" panel already
prescribed in spike 002. In code, the mock credential path is gated behind a `DEMO_MODE` flag, not
just `DEV_MODE`, so it can never accidentally reach a production bundle.

**Warning signs:**
- The credential-verify badge renders without a `[MOCK]` qualifier.
- `MOCK_KEY_REGISTRY` is renamed or extracted to a shared file alongside real config.
- The spike's `credential.ts` is imported by a non-spike, non-demo path in the app.

**Phase to address:**
Phase 2 (federation integration) — the demo/mock labeling must be present the moment the credential
UI renders. Phase 4 (demo polish) — verify every trust signal in the UI carries a visible scope label.

---

### Pitfall 5: Data-model impedance — ABAC subject/resource model vs. 6-unit deployment scenario

**What goes wrong:**
The spike ABAC engine models `principal` and `requirement` as generic objects
(`{ clearance, domain, compartments, flags, entity }`). The 6-unit deployment scenario maps real
units (Military A, Intel, Industry, etc.) onto these generic attributes. When integrating, a developer
creates two parallel data models: one `Person` type from the Rust/Postgres substrate (with `id`,
`clearance_level`, `org_id`) and one `ABACSubject` type in the spike (with `clearance`, `domains`,
`compartments`, `entity`). Inconsistency accumulates: the same person has different clearance values
in the two models, and queries that join them return contradictory decisions.

**Why it happens:**
The spikes lived in `src/spikes/` behind a separate entry point and were never forced to use the
substrate's data shape. When integration starts, the convenient path is to keep both models in
parallel and write a mapping function — but that mapping function becomes a bug multiplier every time
either model changes.

**How to avoid:**
Define a single canonical `ABACSubject` interface at the start of Phase 1 that is the output of
transforming the substrate `Person` record. There is no "ABAC subject object" that exists
independently — it is always derived from the canonical record via a pure function
`toABACSubject(person: Person): ABACSubject`. The spike's data.ts `SUBJECTS` seed is replaced by
derived transformations over the same seeded Person records used by the demo. Compartments and flags
live in their own event-sourced log, not as fields on both models simultaneously.

**Warning signs:**
- Two files named `subjects.ts` and `persons.ts` (or similar) with overlapping fields.
- A `mappingUtils.ts` or similar bridge file grows beyond ~30 lines.
- A clearance value differs between the hub view and the ABAC decision trace for the same person.
- Spike components import from their own `data.ts` rather than from the app's data layer.

**Phase to address:**
Phase 1 (foundation / data model) — define the canonical transform before any spike is wired. Make
the spike's `data.ts` seed a test fixture only; never import it from app routes.

---

### Pitfall 6: Obligation rules conflated with stored grants or static attributes

**What goes wrong:**
The deployment-driven support obligation ("unit A is abroad → supporting units gain access") gets
implemented as a stored grant row or a static boolean attribute on the subject. When the deployment
ends, someone must remember to revoke the grant. The whole point of obligation rules is that they turn
OFF automatically when context changes. A stored grant turns a dynamic, context-sensitive access into
a persistent one — the audit log can no longer answer "would this person have access if they were NOT
deployed abroad?" and the demo fails to prove the obligation mechanism.

**Why it happens:**
Stored grants are the natural solution pattern for "give person X access to Y". The brownfield
substrate has a real access-grant table. The obligation spike (009) was isolated and the developer
wiring it into the app reaches for the familiar pattern.

**How to avoid:**
Obligation rules must be implemented as a rule *class* in the ABAC engine — a `GRANT` effect that
fires only when `context.deploymentStatus === 'ABROAD' && requester.hasObligation === true`.
`hasObligation` itself is a context attribute derived from the deployment registry, not stored on the
subject. The ABAC engine evaluates it live. The demo must show the decision flip: switch deployment
status to 'HOME', re-run evaluation, observe DENY (and the trace must explain why the obligation did
not fire). If the demo cannot show the flip live, the mechanism is not demonstrated.

**Warning signs:**
- An `obligation_grants` table or array is created that persists beyond a session.
- "Obligation" appears as a field on `Person` or `Subject` alongside clearance.
- The demo has no UI affordance to toggle deployment status and observe the decision change.

**Phase to address:**
Phase 3 (context / obligations) — the obligation rule and its toggle must be built and verified
together; never defer the toggle to a later phase.

---

### Pitfall 7: Demo legibility — a technically correct demo that a non-technical viewer cannot follow

**What goes wrong:**
The demo shows an ABAC decision trace with five rule rows, two entity names, three domain labels, and
a HMAC badge — and a non-technical viewer concludes "it seems to work" without understanding *why* the
access was denied or *what* the hub is protecting. The whole point of the demo is to prove the model
to stakeholders who cannot read TypeScript. If they cannot trace a decision from cause to effect, the
demo has failed its purpose even if technically correct.

**Why it happens:**
Engineers optimize for correctness, not legibility. The `DecisionTrace` component from the spikes
renders the raw rule objects. Labels come from internal identifiers
(`CLEAR_HOLD`, `GRANT_COMPARTMENT`, etc.). The 6-unit names are shortened to ids. There is no
narrative layer.

**How to avoid:**
Separate the display layer from the evaluation layer before Phase 4 (demo polish). Every rule trace
must render in plain prose: "Denied: subject's Computer domain tier (2) is below the required
threshold (3)." Every entity must show its full scenario name (e.g., "Military Unit A",
"Intelligence Agency"), not an internal id. The demo script must include a live walkthrough where
one non-developer witnesses it and can narrate back what happened — if they cannot, the labels need
work before the demo is considered done. Build in a "scenario card" for each of the 6 units explaining
its access profile in one sentence.

**Warning signs:**
- Rule trace strings contain camelCase identifiers or enum values.
- Entity identifiers are UUIDs or short codes in the UI.
- The demo walkthrough requires verbal explanation beyond what is shown on screen.
- No "what this means" plain-language annotation exists for each mechanism.

**Phase to address:**
Phase 4 (demo polish) — allocate dedicated time for a legibility pass. Do not defer to "we'll explain
it live" — that is a risk, not a plan.

---

### Pitfall 8: Security theater — a demo that implies production guarantees it does not have

**What goes wrong:**
The demo presents a "deny" decision with a green lock icon, a "verified credential" badge, and an
audit log — and a viewer concludes the system *is* secure, not that it *demonstrates a security
model*. If the demo is then cited in procurement, a security review, or a contract as evidence of
production-grade authorization, it creates liability and false expectations. The inverse also harms:
a reviewer dismisses the demo as "just a mock" because they cannot see where the real enforcement
boundary is.

**Why it happens:**
The line between "demonstrates a concept" and "provides a guarantee" is architectural, not visual.
The demo's UI intentionally mimics production UI (shadcn/ui components, realistic labels). No visible
scope warning exists.

**How to avoid:**
Add a persistent, non-dismissable "DEMO / MOCK" banner to the demo entry point — not just a footer
note but a top-bar element that renders on every demo page. The federation flow and credential-verify
flow each have a "What this simulates / what a real build requires" expandable panel (the spike 002
pattern). Never use lock icons or "Secure" language without a `[DEMO]` qualifier. The demo README
and any slide deck must include an explicit "what this proves" vs. "what this does not prove" section.
Code-level: all mock boundaries (`MockNetwork`, `MockClearanceFeed`, `MockKeyRegistry`) are in a
`mock/` subdirectory that is excluded from any production build configuration.

**Warning signs:**
- Lock icons or "Secure" badges render without a `[MOCK]` qualifier.
- The demo entry point looks identical to a production app (no demo banner).
- `MockNetwork` is in `lib/` rather than `mock/`.
- A slide deck has a screenshot with the word "VERIFIED" and no scope annotation.

**Phase to address:**
Phase 1 (foundation) — establish the mock/ boundary and the demo banner in the first usable slice.
Phase 4 (demo polish) — verify scope labels are present and accurate throughout.

---

### Pitfall 9: Directional shielding implemented as symmetric deny — intel data leaks outward

**What goes wrong:**
The directional shielding mechanism (spike 009) for intel and industry data is implemented as a
symmetric access restriction — "intel can't access industry data AND industry can't access intel
data." The spec requires *directional* shielding: intel reads broadly (most entities' data), but
intel's own data is shielded from most entities. A symmetric implementation means intel loses read
access it should have, and the demo fails to show the directional asymmetry — which is the most
novel part of the access model for the 6-unit scenario.

**Why it happens:**
Symmetric deny is simpler to implement (one flag on the resource: `shielded = true`). The directional
nature requires resource-side default-deny plus explicit allowlisting per requester — an asymmetric
policy that is easy to implement as symmetric when rushing.

**How to avoid:**
The shield policy must specify a direction: `shieldedOwner` (who owns the protected resource) plus
an `allowlist` (who may access it despite the shield). A requester NOT on the allowlist is denied
intel/industry resources; the same requester accessing non-shielded resources is unaffected by the
shield. The demo must show both directions live: intel person queries military data (ALLOW), military
person queries intel data (DENY — shielded), allowlisted security officer queries intel data (ALLOW).
All three decisions must be observable in one demo flow.

**Warning signs:**
- Shield logic is a single `isShielded` boolean on the requirement without an allowlist.
- Intel entity cannot access military unit data in the demo.
- The three-direction test (intel→military, military→intel, allowlisted→intel) does not exist as a
  Vitest test case.

**Phase to address:**
Phase 3 (context / policy integration) — the shield implementation must include the allowlist and
the three-direction test before the phase is complete.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep spike's own `data.ts` as the source of truth | No migration effort | Two data models diverge; ABAC decisions don't reflect real Person records | Never — replace with derived transform in Phase 1 |
| Inline policy rules as hardcoded TypeScript constants | Fast to write | Per-entity policy divergence (spike 008) requires runtime variation; hardcoded rules make it impossible | Never for the 6-unit scenario; acceptable for single-entity spike isolation only |
| Full audit log replay on every query | Correct and simple | Visible jank in timeline-slider UI; kills demo legibility for the audit mechanism | Acceptable only for historical point-in-time queries, never for "access right now" |
| Symmetric shield flag instead of directional allowlist | Simpler data model | Breaks intel's read-broad behavior; misrepresents the model to viewers | Never — directional asymmetry is the differentiating mechanism |
| `if (DEV_MODE) skip verification` for credentials | Removes crypto setup friction | Any DEV_MODE deployment (e.g., staging) silently skips trust verification; future engineer copies the pattern | Never — use `MOCK_KEY_REGISTRY` instead, which runs the verification path with mock data |
| Flat role list for scoped roles (Manager/Sponsor/Subject) | Simpler implementation | Auth-MODEL §6 requires data-level ownership scoping; flat list cannot express "own team" | Acceptable for demo Phase 1–3 with explicit "TODO: scoping" marker; must be resolved in Phase 4 demo polish or flagged as out-of-scope |

---

## Integration Gotchas

Common mistakes when connecting spike components to the app.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Spike ABAC engine → app routes | Rewrites `abac.ts` from scratch to "fit the app shape" | Lift `sources/code/lib/abac.ts` directly; adapt the input type at the boundary, not the engine |
| Audit log → React state | Store `events[]` as plain useState; derive projection on every render | Keep `events[]` + `projection` as co-evolving state; update projection incrementally on append |
| Federation handshake → app navigation | Wire the "Request detail" button to a route change | The handshake is a *modal flow* within the current route — navigating away loses in-progress state |
| Obligation context → deployment status | Read deployment status from the Person record | Deployment status is a context attribute external to the person — comes from a `MockDeploymentFeed`, not from `person.deploymentStatus` |
| Per-entity policy → UI toggle | Gate entire entity views behind a policy toggle | Policy divergence is a runtime property of the *evaluation*, not a view toggle; the same UI must show different decisions for different requesting entities |
| Mock boundaries → real backend calls | Use `apiFetch` for any federation or clearance data | All federation + clearance paths go through `MockNetwork` / `MockClearanceFeed` in `src/mock/`; never route through `src/lib/api.ts` |

---

## Performance Traps

Patterns that work at small scale but break in the demo context.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full replay `whoCanAccess` per render | Timeline slider causes visible lag | Materialize projection; replay only for slider historical queries | With >50 events and a slider interaction |
| Re-evaluating all subjects on every ABAC query | CPU spike when switching "requesting entity" | Evaluate only the subject under inspection; batch only for "who can access" full-list views | With >20 subjects and frequent role/entity switching |
| Rendering full `DecisionTrace` for every row in a list | Long list of persons all with expanded traces causes DOM bloat | Collapse traces by default; expand on click | With >10 items in a list |
| Importing all spike components into the main app bundle | Initial load slow; confuses the TanStack router | Spike components stay behind `spikes.html` entry; only extracted lib code (`abac.ts`, etc.) enters the app bundle | From day one of integration |

---

## Security Mistakes

Demo-specific security issues (not production hardening, but demo correctness and non-misrepresentation).

| Mistake | Risk | Prevention |
|---------|------|------------|
| Seeding the mock key registry client-side in a JS bundle | Anyone can forge a "verified" credential by extracting the key; the demo's "verification" claim is false even for a demo | Keep mock keys as symbolic labels (e.g., `'MOCK_KEY_UNIT_A'`) that only the mock registry resolves — no real key material in the bundle |
| Storing clearance values in localStorage or URL params | A demo viewer can elevate their own clearance by editing browser state; the demo then "proves" an elevated-privilege path was correctly authorized | Clearance is seeded server-side (Rust API seed) or in-memory read-only; never mutable from the browser |
| Applying deny overrides only at UI layer | A direct API call bypasses the UI guard; the backend demo API returns ALLOW for a revoked subject | Deny override evaluation is in the TypeScript engine (frontend mock) AND any backend endpoint that surfaces access decisions must re-evaluate — not trust UI state |
| Confusing operating-role RBAC with ABAC resource authorization | Access Approver role gate in the UI does not guarantee ABAC evaluation occurred | Operating roles gate which *actions* are available (spike 004); ABAC gates the *decision* — both must be present; one does not substitute for the other |

---

## UX Pitfalls

Common user experience mistakes specific to this demo domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw ABAC rule identifiers (`GRANT_COMPARTMENT`, `securityHold`) in decision traces | Non-technical viewer cannot interpret the trace | Render trace in plain prose: "Denied: security hold is active." Never expose internal event type names |
| Collapsing all 6 unit scenarios into one generic "entity" view | Viewer cannot see the policy divergence — the most important differentiator | Each unit has a named scenario card; the demo explicitly switches between them to show different outcomes for the same request |
| Rendering ALLOW/DENY as identical-weight text in a list | Viewer loses track of which outcomes were denies | DENY rows use a visually distinct style (not just color — also icon or indentation) so the audit review is scannable |
| Hiding the hub's "what we do NOT store" boundary | Viewer assumes the hub holds sensitive data (violating the privacy model) | Show an explicit "hub contains: subject ID + entity + domain. Hub does NOT contain: clearance, tier, compartments." panel as designed in spike 002 |
| No undo / state reset in the demo | A live demo that goes wrong mid-walkthrough cannot recover | Provide a "Reset scenario" button that returns to seeded state; never demo without it |

---

## "Looks Done But Isn't" Checklist

- [ ] **ABAC engine wired:** Verify `evaluate()` is called with a real `ABACSubject` derived from app data — not a hardcoded object. Check that `DecisionTrace` renders visible rule rows for both ALLOW and DENY paths.
- [ ] **Audit log with projection:** Verify a `currentProjection` map exists and is updated incrementally. Check that `whoCanAccess(asOf = now)` hits the projection, not a full replay.
- [ ] **Credential verification:** Verify `verifyCredential` is called before any ABAC evaluation on a cross-entity credential. The `[MOCK]` label must be visible in the UI at the verification result.
- [ ] **Obligation flip observable:** Verify the demo has a deployment-status toggle. Toggle to HOME, verify the obligation GRANT rule does not fire, verify the trace explains why.
- [ ] **Directional shield observable:** Verify three paths exist in the demo: requester → shielded resource (DENY), shielded-owner → other resource (ALLOW), allowlisted requester → shielded resource (ALLOW).
- [ ] **Per-entity policy divergence:** Verify the same request submitted as Military Unit A vs. Intelligence vs. Industry produces different decisions, and the trace identifies the policy difference.
- [ ] **SoD enforced:** Verify Admin role cannot trigger `approve_attribute` or `revoke_attribute` actions. Verify Manager role can `request_attribute` but not approve. Verify the UI renders an explicit "no access-decision authority" state, not just a missing button.
- [ ] **Demo/mock labeling:** Verify every mock boundary (credential, clearance feed, network) renders a `[MOCK]` label in the UI. Verify the demo banner is persistent and non-dismissable.
- [ ] **Scenario reset:** Verify a "Reset scenario" control exists and returns the demo to seeded state cleanly.
- [ ] **Scoped roles flagged:** Verify that Manager/Supervisor, Org Sponsor, and End User/Subject scoped behaviors have explicit "TODO: data-level scoping" labels where flat-role approximations are used.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Two parallel data models (ABAC subjects + Person substrate) have diverged | HIGH | Define canonical `toABACSubject(person)` transform; migrate spike usages one at a time; add a test that the same person ID returns identical attributes from both paths before deleting the old model |
| Audit replay performance is unacceptable | MEDIUM | Add `currentProjection` map alongside existing log state; update incrementally on every `appendEvent` call; regression-test that projection matches full replay result for the same `asOf = last seq` |
| Obligation is stored as a grant row | HIGH | Delete grant rows; implement obligation as a context-attribute rule in the ABAC engine; add the deployment-toggle UI; verify the flip before considering recovery complete |
| Mock credential boundary removed or bypassed | MEDIUM | Reintroduce `MockKeyRegistry` in `src/mock/`; add a lint rule or code-search CI check that `DEMO_MODE` bypass patterns do not exist outside `src/mock/` |
| Demo legibility fails in live walkthrough | LOW | Run a label-and-prose pass: replace all rule identifiers with plain English strings; add scenario cards for each of the 6 units; re-validate with one non-developer before the next walkthrough |
| Security theater — demo cited as production evidence | HIGH | Add the persistent `[DEMO / MOCK]` banner and "what this proves / does not prove" panel immediately; communicate scope explicitly in any external-facing material that references the demo |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Over-engineering toward production | Phase 1 — establish mock/ boundary and demo constraints | No non-mock backend endpoints exist for federation or clearance paths after Phase 1 |
| Mock so hollow it proves nothing | Phase 1 — define "convincing demo" criteria; Phase 2 — verify real spike logic called | Vitest tests call actual `evaluate()` with real subject data, not stubs |
| Audit replay performance trap | Phase 2 — build projection alongside log | Timeline slider renders under 100 ms measured with React DevTools profiler |
| Mock signature conflated with real trust | Phase 2 — add [MOCK] labels to credential UI | Every credential result in the UI has a visible [MOCK] scope label |
| Data-model impedance (ABAC vs. substrate) | Phase 1 — canonical `toABACSubject` transform defined | No second definition of "subject attributes" exists outside the transform |
| Obligation conflated with stored grant | Phase 3 — obligation rule implemented; deployment toggle required | Deployment toggle changes decision outcome; no obligation_grants table or array exists |
| Demo legibility | Phase 4 — legibility pass with non-developer witness | One non-developer can narrate the decision from ALLOW/DENY trace without verbal coaching |
| Security theater | Phase 1 (banner); Phase 4 (full scope label audit) | Persistent demo banner visible; every mock boundary labeled in UI |
| Directional shielding implemented as symmetric | Phase 3 — three-direction Vitest test | `shield.test.ts` covers intel→military ALLOW, military→intel DENY, allowlisted→intel ALLOW |

---

## Sources

- Spike findings skill: `.claude/skills/spike-findings-janus-2.0/` (references/abac-engine.md, references/audit.md, references/federation.md, references/policy-and-context.md, references/roles-sod.md)
- AUTH-MODEL.md: `.planning/AUTH-MODEL.md` — sections §3 (pure-computed ABAC), §8 (SoD), §10 (demo/mock implications), §12 (6-unit deployment scenario)
- PROJECT.md: `.planning/PROJECT.md` — demo/mock constraints, out-of-scope list
- Spike 007 audit reference constraint: "Full replay per query won't scale — materialize a 'current access' projection from the log for hot queries"
- Spike 006 trust constraint: "Demo uses symmetric HMAC + a mock key registry; a real build uses asymmetric/verifiable credentials + real key distribution"
- Spike 009 policy constraint: "Obligations need a real deployment/posting feed + time-bounding + auto-revocation on return"
- Spike 002 hub constraint: "If you find yourself wanting clearance/compartments in the hub, that belongs at the entity, reached via handshake"

---
*Pitfalls research for: Janus 2.0 — Federated ABAC Authorization Hub DEMO*
*Researched: 2026-05-21*
