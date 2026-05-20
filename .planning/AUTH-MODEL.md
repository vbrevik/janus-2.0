# Janus 2.0 — Authorization Hub Model (Design Contract)

**Status:** Model definition — DEMO/MOCK system, build later
**Defined:** 2026-05-20
**Supersedes the scope of:** `.planning/REQUIREMENTS.md` + `.planning/ROADMAP.md` (the "Frontend Consolidation" milestone — GUARD/ROUTE/TEST/CLEAN). Those are paused, not deleted.

> **This is a DEMO / MOCK system, not a production deployment.** External integrations
> (clearance sources, identity federation, inter-entity transport) are **simulated**.
> Purpose: demonstrate the model convincingly enough to show **what might work — or
> not work** — before committing to a real build. Do not over-engineer hardening.

---

## 1. Mission & Boundary

- **Ours:** manage **authorizations across three domains — computer, data, physical.**
- **Not ours:** clearance *determination*. Clearance levels + the clearance process are owned by **external entities**; Janus consumes clearance as a **read-only attribute**.
- **New core:** a **central authorization-exchange hub** plus an **interchange contract** other entities conform to.

## 2. Architecture — Federated Hub + Subscriber Entities

- **Central hub** = a privacy-preserving **discovery index**: records *who-knows-what*
  (which entity holds authorization info about which subject, in which domain) — **with no
  sensitive details**. Pointers only.
- **Subscriber entities** (a few, to start) publish their "I hold authz info about subject X"
  pointers to the hub and query the hub to discover others. **Authorization details are
  exchanged entity-to-entity**, never stored in the hub.
- **(demo)** hub + entities are simulated within the app / mock services.

## 3. Decision Engine — Pure Computed ABAC

- Access is **evaluated live from attributes**; there are **no stored access rows**.
- A "grant" becomes **approving an attribute** (e.g., Approver approves a need-to-know
  compartment for a subject); access is then computed.
- **Audit** = logging policy **evaluations** ("who has access right now" is computed, not stored).

## 4. ABAC Attributes (core data-model fields)

| Attribute | Source | Notes |
|-----------|--------|-------|
| Clearance level | External | Imported, read-only in Janus |
| Domain + tier | Janus | computer / data / physical, with a level/tier per domain |
| Entity / org affiliation | Janus | drives scoping + cross-entity exchange |
| Need-to-know / compartment | Janus | caveats/compartments gating beyond raw clearance |

## 5. Authorization Domains

Computer · Data · Physical — each with its own tier/level scheme (exact tiers TBD in build).

## 6. Operating Roles (8) — who *runs* Janus (distinct from ABAC resource access)

| Role | Type | Duty | Maps from |
|------|------|------|-----------|
| System Administrator | global | System config, user accounts, role assignment | `admin` |
| Security Officer | global | Clearance import mapping, NDAs, info-system security, personnel security annotations | — |
| Access Approver / AO | global | Decision authority: approves/revokes domain authorizations (attributes) | possibly `official` |
| Personnel / Org Manager | global | Maintains identity/demographics + org/vendor records + relations | — |
| Auditor / Compliance | global | Read-only everywhere; owns the audit/evaluation log | — |
| Manager / Supervisor | scoped | Own team: view reports, initiate their requests | — |
| Org / Vendor Sponsor | scoped | Own organization: its people + NDAs | — |
| End User / Subject | scoped | Self: own profile, sign own NDAs, view own authorizations + tasks | `enduser` |

`official` (legacy) is retired/redefined.

- **Global** roles are expressible by route guards / role checks.
- **Scoped** roles need data-level (ownership/relationship) authorization — not a flat role list.

## 7. Operating-Role Permission Matrix (roles × app objects)

Full=CRUD · Edit=create/update · View=read · Approve=decision · Own/Self=scoped · —=none

| Role | Personnel | Orgs/Vendors | Info Systems | NDAs | Domain Authz | Discussions | Audit Log | Sys/User Admin |
|------|-----------|--------------|--------------|------|--------------|-------------|-----------|----------------|
| System Admin | View | View | Edit | View | — | Edit | View | **Full** |
| Security Officer | Annotate | View | **Full** | **Full** | Flag | Edit | View | — |
| Access Approver | View | View | View | View | **Approve/Revoke** | View | View | — |
| Personnel/Org Mgr | **Edit (identity+affiliation)** | **Full** | View | Edit | — | Edit | — | — |
| Auditor | View | View | View | View | View | View | **Full (read)** | — |
| Manager/Supervisor | Own team | — | — | Own team | Request | Edit | — | — |
| Org/Vendor Sponsor | Own org | Own org | — | Own org | — | Own org | — | — |
| End User/Subject | Self | — | — | Self (sign) | Self (view) | Participate | — | — |

*Clearance is external/read-only — no role edits it.*

## 8. Separation of Duties (locked)

- **Admin = strict SoD:** system + user/role administration only; cannot grant access or manage clearances.
- **Domain authorization:** Approver decides; Manager/Supervisor requests for their team; Security Officer flags risk but cannot grant.
- **Personnel:** Personnel/Org Manager edits identity + affiliation; clearance imported/read-only; Security Officer owns security annotations + the external-clearance import mapping.

## 9. Open Questions (resolve during build/re-scope)

1. **Hub boundary** — exact split of what's in the hub index vs. held at entities.
2. **Interchange schema/API** — concrete publish-pointer / discover / request-detail contract.
3. **Initial subscriber entities** — who/how many for the demo.
4. **Identity/auth federation** — hub-level vs per-entity (external IdP?).
5. **ABAC policy authorship** — per-entity vs common hub policy; how policies are expressed.
6. **Audit under pure-ABAC** — evaluation-logging format + how "current access" is reconstructed.

## 10. Demo / Mock Implications

- **Real in the demo:** UI/flows, in-memory ABAC policy evaluation over seeded data, the hub
  discovery index, 2–3 simulated subscriber entities, the operating roles + SoD.
- **Mocked/stubbed:** external clearance feed (seeded JSON), identity federation, real
  inter-entity network transport (simulated in-process), persistence (can be in-memory/seed).

## 11. Status of prior Phase-1 artifacts

- `01-RESEARCH.md` and `01-UI-SPEC.md` were produced **before** this pivot and reflect the old,
  narrow "canonical guard" scope. Treat as historical.
- No Phase-1 `SPEC.md` was written (spec-phase was redirected into this model definition).

## 12. Target Deployment Scenario (subscriber units)

The concrete real-world units the hub must serve (future). Each is a subscriber entity with its own
release policy (validated mechanism: spike 008).

| Unit | Access profile | New model demands |
|------|----------------|-------------------|
| Military unit A | Broad access to most | Wide allow policy across domains |
| Military unit B | Broad access to most | Wide allow policy across domains |
| Intelligence | Read almost all; **its own data shielded from most users** | **Directional shielding** — intel-owned resources default-deny + explicit allow (asymmetric in vs out) |
| Inventory / building / real-estate | Read all **infrastructure** | Domain-scoped read (physical/asset domain) |
| Industry | **Shield business secrets**; detect **who leaks stock info** | Strict need-to-know compartments + **leak/anomaly detection** on the audit log (spike 007) |
| Home guard | **Territorial** — "what happens in our turf" | **Location/territory** attribute scoping |

**Cross-cutting — support obligations:** when a subunit is **deployed abroad**, other units have a
*support obligation* to it → must gain access to that subunit's relevant records. A **dynamic,
context-driven** grant.

### New mechanisms beyond what spikes 001–008 proved
- **Environment/context attributes:** location/territory, deployment status (home vs abroad).
- **Obligation rule class:** deployment-driven, time-bounded access that turns on/off with context — not a static attribute or a stored grant. (Most novel; "might not work" risk — candidate spike.)
- **Directional shielding:** resource-side default-deny with explicit allow (intel, industry secrets).
- **Leak/anomaly detection:** monitoring layer over the audit log (industry stock-info leaks).

These extend, not contradict, the validated model: units = per-entity policies (008); context attributes
feed the ABAC engine (001); obligations are a new rule class; leak detection sits on the audit log (007).

---

*Model defined 2026-05-20 via spec-phase interview, redirected from Phase 1 (canonical-guard).*
*Target deployment scenario added 2026-05-20.*
