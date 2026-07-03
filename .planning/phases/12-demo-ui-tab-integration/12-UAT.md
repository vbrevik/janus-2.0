---
status: diagnosed
phase: 12-demo-ui-tab-integration
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md, 12-05-SUMMARY.md, 12-06-SUMMARY.md]
started: 2026-07-03T19:00:00.000Z
updated: 2026-07-03T19:07:50.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Seed data applied and idempotent (12-01 D1/D2)
expected: janus2 dev DB has the 6-unit digital-resource dataset (6/4/4/18/3/15/18/1); re-running the apply script is a no-op.
result: pass
source: automated
coverage_id: 12-01/D1,D2

### 2. Mapper denormalizes /world response correctly (12-02 D1)
expected: mapWorldResponse resolves flat org_links/policy_assignments onto the right node, resolves policy_id to full objects, throws on dangling references.
result: pass
source: automated
coverage_id: 12-02/D1

### 3. Reducer actions preserve client-only state (12-02 D2)
expected: SET_DIGITAL_RESOURCES preserves disabledResourceGrantIds; UPSERT_RESOURCE_* replace-or-append without duplicates.
result: pass
source: automated
coverage_id: 12-02/D2

### 4. Loader auth helpers read main-app session correctly (12-03 D1/D2)
expected: hasStoredToken/getStoredUserRole read the same localStorage keys auth-context writes; classifyLoaderState discriminates all six states.
result: pass
source: automated
coverage_id: 12-03/D1,D2

### 5. Full build + test suite green
expected: npm run build zero TS errors; full vitest suite passes with only additive growth over baseline.
result: pass
reason: Coverage entries in 12-02/12-03/12-04/12-05/12-06 used a non-standard `kind: build+unit` value that classify-coverage's schema doesn't recognize, so it couldn't auto-pass these — but I re-ran both commands myself this session. npm run build: 0 TypeScript errors. npm run test: 17 files / 225 tests passed. cargo test security_hardening_test --include-ignored: 13/13 passed (Phase 11 security suite unrelaxed).

### 6. Resource tree renders real seeded data, expand/collapse works (12-04 D1)
expected: Digital Resources tab shows 6 seeded networks; clicking a network's caret expands to show its platform, clicking the platform's caret shows its application; clicking a row (not the caret) selects it without toggling expansion.
result: pass
reason: Verified live in browser as admin — HomeGuardNet/IndusNet/InfraNet/IntelNet/MilNet/TacNet-Mil2 all present; InfraNet -> InfraPlatform-1 -> InfraApp-1 expand chain confirmed with correct independent select/expand click targets.

### 7. Detail panel shows tier-appropriate fields, Application shows "(inherited)" classification, Platform shows NSM badge (12-04 D2)
expected: Network/Platform detail shows Tier + Classification (no inherited suffix) + org links + active policy + grants + delegates; Platform additionally shows an NSM annotations card (slate-only pills, "not enforced as access gates in v2.2" note); Application shows Classification with "(inherited)" suffix and no NSM card.
result: pass
reason: Verified live for InfraNet (Network, plain CONFIDENTIAL), InfraPlatform-1 (Platform, plain CONFIDENTIAL + NSM card with the two exact Norwegian terms + exact static-annotation note), InfraApp-1 (Application, "CONFIDENTIAL (inherited)", no NSM card).

### 8. Issue Delegate form is admin-only and round-trips through the real API (12-04 D3)
expected: "+ Issue new delegate" button visible only when logged in as admin; submitting issues a real POST, the new delegate appears in the Delegates list without a page reload; a non-admin sees "Issuing controls require an admin login." instead of the button.
result: pass
reason: As admin: submitted a delegate (Sam Okafor) for InfraApp-1 — appeared in the Delegates list immediately. As viewer (real login, real JWT): the button was entirely absent and replaced by the exact copy "Issuing controls require an admin login." Also confirmed cross-session persistence — the viewer session saw the same delegate the admin session created.

### 9. Gate-chain trace recomputes live per person/resource/timestamp, non-baseline policy adds its extra gate (12-05 D1)
expected: Selecting a different person, resource, or timestamp recomputes the full gate-chain trace; a resource on the non-baseline policy (extra REQUIRED_ROLE gate) shows 4 gates instead of 3; policy-version label always shown.
result: pass
reason: Verified live — HomeGuardNet (baseline policy) showed 3 gates (Clearance/Own-tier/Parent-tier); IntelNet (Enhanced/non-baseline policy) showed 4 gates including "Required role", which flipped ✓/✗ correctly when switching person (Dana Reyes -> Lee Park).

### 10. Zone-advisory amber row renders when the resolved policy has a zone_prereq_id (12-05 D2, RSRC-UI-05)
expected: When resolving access against IntelNet (whose Enhanced policy carries `zone_prereq_id: "zone-room-sr1"`), an amber "Advisory (non-blocking)" row appears below the gate list, per 12-UI-SPEC.md and the RSRC-SEED-04 dataset requirement built specifically to exercise this.
result: issue
reported: "The amber zone-advisory row never appears for any person/resource/timestamp combination, including IntelNet which was seeded specifically to carry a zone prerequisite (zone-room-sr1, confirmed present in the ZONES export)."
severity: major

### 11. Grant toggle recomputes the verdict live (12-05 D2)
expected: Unchecking a person's grant checkbox on the currently-selected resource flips "Own-tier grant" from ✓ to ✗ and marks the grant "(disabled)" in the list; re-checking restores it.
result: pass
reason: Verified live on IntelNet/Dana Reyes — unchecking flipped OWN_TIER_GRANT_FOUND to NO_OWN_TIER_GRANT with the "(disabled)" tag; re-checking restored it.

### 12. Issue Grant form is admin-only, defaults to first resource (not current selection), and round-trips through the real API (12-05 D3)
expected: "+ Issue new grant" visible only for admin; Resource field defaults to the first resource in the flat list (per 12-UI-SPEC.md — NOT the currently-selected resource, unlike the Delegate form); submitting issues a real POST and the grant appears live; non-admin sees "Issuing controls require an admin login." instead of the button.
result: pass
reason: As admin: form defaulted to "[NETWORK] HomeGuardNet" (first in list) even though IntelNet was selected in the explorer — confirmed this matches 12-UI-SPEC.md's explicit "First resource is default" wording for this form (verified by reading the spec, not a bug). Submitted a grant for Lee Park @ IntelNet — appeared immediately when switching the Person selector to Lee Park (OWN_TIER_GRANT_FOUND). As viewer: button entirely absent, exact admin-login copy shown instead.

### 13. Six-state loader gate and 7th DemoRoot tab (12-06 D1/D2)
expected: Missing token shows "Not logged in." with no fetch attempted; valid token + successful fetch shows the Resource Browser / Access Resolution sub-nav with real data; the "Digital Resources" tab sits alongside the other six unchanged tabs.
result: pass
reason: Verified live: with no token, exact copy "Not logged in. / The demo reuses your main-app session..." shown, no GET /world attempted. With a valid (later found to be time-expired) token, the exact "Session invalid or expired." state rendered correctly too — incidentally exercising a 3rd of the six states. With a fresh valid token, the success state loaded real 6/4/4 data and the sub-nav rendered; all 6 other tabs (Decision Explorer, Federation Hub, Entity Console, Audit, Context, Physical Access) remained present and functional throughout.

## Summary

total: 13
passed: 12
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The amber, non-blocking zone-advisory row (RSRC-UI-05) renders in the Access Resolution Explorer whenever the resolved policy's zone_prereq_id points to an existing zone"
  status: failed
  reason: "Confirmed live: selecting IntelNet (whose Enhanced access policy carries zone_prereq_id: \"zone-room-sr1\", a zone that exists in the seed's ZONES export at zone-room-sr1) across multiple persons/timestamps never renders the advisory row, even though the JSX conditional and amber Pill exist and were grep-verified by 12-05-SUMMARY.md."
  severity: major
  test: 10
  root_cause: "frontend/src/demo/lib/digital-resource-selectors.ts:101-135 (resolveResourceAt) hardcodes empty arrays for both allZones and allPhysicalGrants when calling the core resolver (resolveResourceAccess in model.ts). model.ts:1132-1143 only sets zoneAdvisory when `allZones.find(z => z.id === policy.zone_prereq_id)` succeeds — with allZones always [], that find() always returns undefined, so zoneAdvisory is permanently null regardless of seed data. The selector's own comment even says '// no v2.1 zones passed in — advisory resolves via policy.zone_prereq_id', which is incorrect: no zones means it can never resolve."
  artifacts:
    - path: "frontend/src/demo/lib/digital-resource-selectors.ts"
      issue: "resolveResourceAt passes [] for allZones and [] for allPhysicalGrants instead of the real v2.1 ZONES export and physical grants, permanently disabling the zone-advisory feature it's meant to expose"
  missing:
    - "Import ZONES (and the physical-access-grants equivalent, e.g. GRANTS or the WorldState's physical grants) from seed.ts / world-state and pass them into resolveResourceAccess in place of the two hardcoded [] arguments"
    - "A unit test on resolveResourceAt (not just the underlying model.ts resolver, which is already tested) asserting zoneAdvisory is non-null for a resource whose policy carries a real zone_prereq_id — this is exactly the gap that let build+grep checks (which only verify the JSX exists) miss a fully dead data path"
  debug_session: ""

## Notes (non-gap, informational)

- **Pre-existing, out-of-scope issue found during testing:** logging in as a non-admin seed user (viewer, and presumably operator/manager) succeeds (valid JWT stored) but the post-login `navigate({ to: defaultRoute })` in `frontend/src/routes/login.tsx` does not redirect away from `/login` — the app silently stays on the login page. This is in `getDefaultRoute`/the main login flow, not anything built in Phase 12, and did not block any Phase 12 testing (worked around by navigating directly to `/demo.html` once the token was in localStorage). Flagging for awareness, not filing as a Phase 12 gap — recommend a `/gsd-capture` or quick follow-up ticket against the auth/login area if the team wants this fixed.
- JWT tokens are the standard 8-hour default; one viewer-role token in this session appeared to fail with "Session invalid or expired." purely because ~9 real-world hours elapsed during this UAT conversation (confirmed via epoch-time comparison against the token's `exp` claim) — re-logging in resolved it immediately. Not a bug; the six-state loader correctly classified and displayed the expired-session state when it happened, which is itself a positive confirmation of test 13's coverage of that state.
