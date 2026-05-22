---
phase: 2
slug: federation-hub
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 2 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Scope: DEMO/MOCK, frontend-only, demo-island (`frontend/src/demo/`). No backend, network, persistence, or real crypto — credential signatures are an intentional `[MOCK]` HMAC. Threats model the demo's integrity-of-demonstration invariants, not production transport/PKI (explicitly out of scope per AUTH-MODEL).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Hub ↔ Unit | Pointer-hub discovery index vs. holder units | Pointers only (holdingUnit + domain) — never clearance/compartments/decision |
| Unit ↔ Unit | Inter-unit detail request/response over the typed `Envelope` contract | Signed credential (`[MOCK]` HMAC) + released record on ALLOW |
| Credential issuer ↔ Holder | Issued clearance credential verified before trust | Signature + claims; only trusted-issuer claims unlock ABAC |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | contract.ts | mitigate | Record-hold force-DENY: `securityHold\|\|revoked` overwrites decision to DENY (`contract.ts:68-83`) | closed |
| T-02-02 | Elevation of Privilege | credential.ts | mitigate | ROGUE-ISSUER absent from `TRUSTED_ISSUERS`; `verifyCredential` returns `valid:false` before key lookup (`credential.ts:47-64`) | closed |
| T-02-03 | Information Disclosure | contract.ts | mitigate | Stateful `Network` class NOT ported (D2-02); only pure functions, no internal pointer/record stores | closed |
| T-02-04 | Elevation of Privilege | world-state.tsx | mitigate | `FEDERATION_RESPOND` carries verified `requester: Principal`; reducer stores `action.requester` directly (`world-state.tsx:135-143,345`) | closed |
| T-02-05 | Tampering | world-state.tsx | mitigate | `FEDERATION_RESET` clears only `fedTranscript`/`fedRunStage`; inbox/outbox append-only (`world-state.tsx:378-381`) | closed |
| T-02-06 | Information Disclosure | world-state.tsx | accept | `fedCredentials` holds `[MOCK]` HMAC demo credentials; demo island only | closed |
| T-02-07 | Information Disclosure | HubDiscoveryPanel.tsx | mitigate | Renders only `holdingUnit` + `domain`; no clearance/compartments/decision (`HubDiscoveryPanel.tsx:45-48`) | closed |
| T-02-08 | Tampering | DemoRoot.tsx | accept | Interim toggle is local `useState`, no dispatch; cannot affect ABAC/federation state (`DemoRoot.tsx:16`) | closed |
| T-02-09 | Tampering | FederationHub.tsx | mitigate | StrictMode `cancelled` guard around `CREDENTIALS_READY` dispatch (`FederationHub.tsx:18,44,59`) | closed |
| T-02-10 | Elevation of Privilege | ExchangeTranscriptPanel.tsx | mitigate | Verify-before-trust: Principal built from claims only when `verifyResult.valid` else UNCLASSIFIED (`ExchangeTranscriptPanel.tsx:48-64`) | closed |
| T-02-11 | Spoofing | CredentialVerifyPanel.tsx | mitigate | Auto-verify both credentials; `[MOCK]` tag on rogue card only (`CredentialVerifyPanel.tsx:12-29,56-78`) | closed |
| T-02-12 | Information Disclosure | ExchangeTranscriptPanel.tsx | accept | `FEDERATION_REQUEST_DETAIL` carries minimal UNCLASSIFIED principal; real principal on RESPOND (two-step design) | closed |
| T-02-13 | Information Disclosure | UnitConsolePanel.tsx | accept | Released record fields rendered only when `entry.granted`; mock fixtures, no real PII | closed |
| T-02-14 | Tampering | UnitConsolePanel.tsx | mitigate | Read-only console: zero functional `dispatch` calls; `selectedUnit` local state | closed |
| T-02-15 | Elevation of Privilege | UnitConsolePanel.tsx | mitigate | Unverified credentials render `unverified` + `[MOCK]` + downgraded-principal note | closed |
| T-02-16 | Tampering | demo/ subtree | mitigate | Demo-island isolation: zero `@tanstack/react-router`/`routeTree.gen` imports in `frontend/src/demo/` | closed |
| T-02-17 | Information Disclosure | vite.config.ts | mitigate | `demo.html` separate build entry from `index.html`; no cross-imports from `src/routes/` | closed |
| T-02-18 | Tampering | package.json | mitigate | No new runtime dependencies (`dependencies` block unchanged vs main) | closed |
| T-02-SC | Tampering (supply chain) | package.json | accept | No new runtime packages across all 6 plans; only devDependency `jsdom` + a devDep rename | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-06 | `[MOCK]` HMAC demo credentials; demo island only, no persistence/transport | demo scope (AUTH-MODEL) | 2026-05-22 |
| AR-02-02 | T-02-08 | Throwaway local `useState` view toggle (D2-04); Phase 4 shell replaces it | demo scope (D2-04) | 2026-05-22 |
| AR-02-03 | T-02-12 | Minimal UNCLASSIFIED principal on REQUEST is intentional two-step protocol; verified principal on RESPOND | design (D2-10) | 2026-05-22 |
| AR-02-04 | T-02-13 | Released record fields are mock fixtures, no real PII | demo scope | 2026-05-22 |
| AR-02-05 | T-02-SC | No new runtime packages; supply-chain surface unchanged | verified via git diff | 2026-05-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 19 | 19 | 0 | gsd-security-auditor (verify mode) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
