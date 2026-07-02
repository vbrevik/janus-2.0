---
id: SEED-012
status: dormant
planted: 2026-07-02
planted_during: v2.2 Platform/Network/Application Access, Phase 11-03 (IDOR fix — Option B shipped, Option A deferred)
trigger_when: when write-authorization for digital resources must reflect which ORGANIZATION a caller acts for (federated/multi-tenant issuance), OR when the resolver's org-based canIssueResourceGrant must govern the REST issue path, OR when person→org membership becomes a first-class attribute in the ABAC model
scope: Large
---

# SEED-012: Org-based resource-issue authorization (resolver-aligned "Option A")

Replace the role-based write gate on the digital-resource issue endpoints
(`POST /api/digital-resources/grants`, `/delegates`) with an **org-based** model
that authorizes the *organization the authenticated caller acts for* — matching
the pure resolver rule `can_issue_resource_grant(org_id, …)`.

## Why This Matters

- Phase 11-03 shipped **Option B (role-based)**: writes are gated on
  `auth.claims.role == "admin"`. This closed a real IDOR (authority was read from
  a client-supplied `actor_org_id`/`granted_by_org_id` in the request body) with
  a minimal, secure fix — but it **diverges from the resolver**, which decides
  issuance authority per *org* (active ADMIN org-link or matching ORG delegate).
- Under Option B, every admin can issue on any resource regardless of org. That
  is acceptable for a single-tenant admin tool, but wrong for the federated /
  multi-entity exchange model v2.x is aiming at, where an org may issue only on
  resources it administers.

## ⚠ Why It Was Deferred (the blocking gap)

Investigated against the live dev DB on 2026-07-02 — **person→org linkage does
not exist in any form**, so Option A is not a code change but a data-model build:

1. **No caller→org mapping.** `person` has no org column. The `relations` table's
   CHECK constraint allows only `person`/`vendor` entities — an org edge is
   *structurally impossible* there. JWT `Claims = {sub, exp, iat, role}` carries
   no org.
2. **No authority data.** `resource_org_links` (the org→resource ADMIN links the
   resolver checks) is **empty**; all `resource_*` tables are empty because the
   11-03 seed migration never applied (`sqlx migrate run` is broken on the drifted
   dev DB).
3. **Two disjoint org identity spaces.** `organizations.id` is an `integer`
   (SERIAL, ex-`vendors`); the resource model's `org_id` is `text` (e.g. a MilNet
   org key). No bridge between them.

## What Adopting This Requires

- A first-class **person→org membership** representation (new column or a proper
  membership table — NOT the person/vendor-only `relations` table), surfaced into
  the auth context (either add `org`/`orgs` to the JWT `Claims`, or resolve
  membership from `sub` at request time).
- Seed **ADMIN `resource_org_links`** (and any ORG delegates) so seed users
  actually resolve to an authorizing org.
- **Reconcile the two org-id spaces** (`organizations.id` integer ↔ resource
  `org_id` text) or pick one canonical id.
- Then swap the handler gate: derive the caller's org server-side and call
  `can_issue_resource_grant(caller_org, resource, delegates, now)` — never trust
  the body. The pure resolver fn already exists (`digital_resources/resolver.rs`)
  and is exercised by the golden-parity test; only the REST wiring changes.

## Related

- Shipped fix: commit `5e7bcb5` (fix(11-03): close digital-resource IDOR with
  role-based write authz (Option B)).
- Resolver rule: `backend/src/digital_resources/resolver.rs::can_issue_resource_grant`.
- Ties into the ABAC re-scope ([[project_scope_pivot_abac]]) — org membership is a
  natural ABAC subject attribute.
