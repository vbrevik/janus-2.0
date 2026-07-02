// Pure gate-chain resolver (Phase 11, Plan 02 — RSRC-BE-02).
//
// Ported byte-for-byte from the TS source of truth in
// frontend/src/demo/lib/model.ts (resolveResourceAccess ~L1084,
// canIssueResourceGrant ~L1163, isWindowActive ~L822, selectActivePolicy,
// effectiveClassification, CLEARANCE_RANK ~L15). This module is PURE:
//   - no Rocket imports, no &State<PgPool>
//   - every time-dependent fn takes an explicit `now: DateTime<Utc>`
//   - NO Utc::now()/chrono::Utc::now() anywhere (determinism — T-11-07)
//
// Structural invariants enforced here (threat register):
//   - OWN_TIER_GRANT is a FLAT resource_id == match — no ancestor walk, no
//     cross-tier inheritance (T-11-05).
//   - is_window_active uses `valid_until >= now` — inclusive boundary (T-11-06).
//   - unknown gate kind + no-active-policy both FAIL CLOSED (T-11-04).
//   - zone_advisory is computed separately and NEVER feeds `allow`. For Phase
//     11 it is stubbed to None even when zone_prereq_id is present (documented
//     deviation, 11-RESEARCH §Open Questions Q3; parity fixtures use
//     zone_prereq_id == null).
//
// DateTime<Utc> note (Plan 03 fix): All DB timestamps are TIMESTAMPTZ; sqlx
// decodes them as DateTime<Utc>. The resolver previously used DateTime<Utc>
// but was updated to DateTime<Utc> throughout so handlers need no conversion.
// The parity test (resolver_parity.rs) constructs its own DateTime<Utc> fixtures.
use chrono::{DateTime, Utc};

use super::models::{
    GateDescriptor, PolicyVersion, ResourceAccessGrant, ResourceAccessResult, ResourceGateResult,
};

// --- Plain (non-DB) input shapes the resolver operates on ---
//
// These mirror the TS NetworkNode/PlatformNode/ApplicationNode/OrgLink fields
// the resolver actually reads. Kept here (not in models.rs) because they are
// the resolver's call contract, not table rows. handlers (Plan 03) assemble
// them from the flat sqlx rows.

pub const TIER_NETWORK: &str = "NETWORK";
pub const TIER_PLATFORM: &str = "PLATFORM";
pub const TIER_APPLICATION: &str = "APPLICATION";

#[derive(Debug, Clone)]
pub struct ResolverOrgLink {
    pub org_id: String,
    pub role: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

// A resource node as the resolver sees it. `classification` is the node's own
// stored classification (None for APPLICATION — derived from the parent
// platform). `parent_id` is network_id for PLATFORM, platform_id for
// APPLICATION, None for NETWORK.
#[derive(Debug, Clone)]
pub struct ResolverResource {
    pub id: String,
    pub tier: String,
    pub classification: Option<String>,
    pub parent_id: Option<String>,
    pub org_links: Vec<ResolverOrgLink>,
    pub policy_assignments: Vec<ResolverPolicyAssignment>,
}

// The active-policy selector reads the window from the assignment and the gate
// list + zone_prereq from the bound policy.
#[derive(Debug, Clone)]
pub struct ResolverPolicyAssignment {
    pub policy: ResolverPolicy,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct ResolverPolicy {
    pub gates: Vec<GateDescriptor>,
    pub zone_prereq_id: Option<String>,
}

// A platform node for the one-hop effective-classification lookup.
#[derive(Debug, Clone)]
pub struct ResolverPlatform {
    pub id: String,
    pub classification: String,
}

// --- Helpers (mirror the TS functions of the same name) ---

// CLEARANCE_RANK (model.ts:15-21). RESTRICTED is rank 1; unknown = -1 (fail closed).
fn clearance_rank(c: &str) -> i32 {
    match c {
        "UNCLASSIFIED" => 0,
        "RESTRICTED" => 1,
        "CONFIDENTIAL" => 2,
        "SECRET" => 3,
        "TOP_SECRET" => 4,
        _ => -1,
    }
}

// isWindowActive (model.ts:822). BOTH boundaries inclusive; null = unbounded.
fn is_window_active(
    valid_from: Option<DateTime<Utc>>,
    valid_until: Option<DateTime<Utc>>,
    now: DateTime<Utc>,
) -> bool {
    let from_ok = valid_from.map_or(true, |vf| vf <= now);
    let until_ok = valid_until.map_or(true, |vu| vu >= now); // >= NOT > (inclusive)
    from_ok && until_ok
}

// selectActivePolicy (model.ts:878). First assignment whose window contains
// `now`, else None — the caller turns None into NO_ACTIVE_POLICY.
fn select_active_policy(
    assignments: &[ResolverPolicyAssignment],
    now: DateTime<Utc>,
) -> Option<&ResolverPolicyAssignment> {
    assignments
        .iter()
        .find(|a| is_window_active(a.valid_from, a.valid_until, now))
}

// effectiveClassification (model.ts:855). NETWORK/PLATFORM return their own
// stored classification; APPLICATION does a SINGLE-HOP lookup to its parent
// platform — never an ancestor walk. Fails closed (returns None) when the
// classification cannot be resolved.
fn effective_classification(
    resource: &ResolverResource,
    all_platforms: &[ResolverPlatform],
) -> Option<String> {
    if resource.tier == TIER_APPLICATION {
        let parent = resource.parent_id.as_deref()?;
        return all_platforms
            .iter()
            .find(|p| p.id == parent)
            .map(|p| p.classification.clone());
    }
    resource.classification.clone()
}

// Active org-role links matching an exact role at `now` (activeOrgLinksForRole).
fn active_org_links_for_role<'a>(
    org_links: &'a [ResolverOrgLink],
    role: &str,
    now: DateTime<Utc>,
) -> Vec<&'a ResolverOrgLink> {
    org_links
        .iter()
        .filter(|l| is_window_active(l.valid_from, l.valid_until, now) && l.role == role)
        .collect()
}

// --- Per-gate evaluators (mirror the TS evaluate*Gate fns) ---

fn evaluate_clearance_gate(subject_clearance: &str, effective_class: &str) -> ResourceGateResult {
    let pass = clearance_rank(subject_clearance) >= clearance_rank(effective_class);
    ResourceGateResult {
        kind: "CLEARANCE".to_string(),
        pass,
        reason: Some(
            if pass {
                "CLEARANCE_OK"
            } else {
                "INSUFFICIENT_CLEARANCE"
            }
            .to_string(),
        ),
    }
}

// FLAT match only — person_id == subject && resource_id == resource.id. No
// ancestor walk (T-11-05).
fn evaluate_own_tier_grant_gate(
    subject: &str,
    resource: &ResolverResource,
    grants: &[ResourceAccessGrant],
    now: DateTime<Utc>,
) -> ResourceGateResult {
    let found = grants.iter().any(|g| {
        g.person_id == subject
            && g.resource_id == resource.id
            && is_window_active(g.valid_from, g.valid_until, now)
    });
    ResourceGateResult {
        kind: "OWN_TIER_GRANT".to_string(),
        pass: found,
        reason: Some(
            if found {
                "OWN_TIER_GRANT_FOUND"
            } else {
                "NO_OWN_TIER_GRANT"
            }
            .to_string(),
        ),
    }
}

// Separate explicit check on the single parent id. NETWORK has no parent and
// passes trivially (NO_PARENT_TIER).
fn evaluate_parent_tier_grant_gate(
    subject: &str,
    resource: &ResolverResource,
    grants: &[ResourceAccessGrant],
    now: DateTime<Utc>,
) -> ResourceGateResult {
    if resource.tier == TIER_NETWORK {
        return ResourceGateResult {
            kind: "PARENT_TIER_GRANT".to_string(),
            pass: true,
            reason: Some("NO_PARENT_TIER".to_string()),
        };
    }
    let parent_id = resource.parent_id.as_deref();
    let found = match parent_id {
        Some(pid) => grants.iter().any(|g| {
            g.person_id == subject
                && g.resource_id == pid
                && is_window_active(g.valid_from, g.valid_until, now)
        }),
        None => false,
    };
    ResourceGateResult {
        kind: "PARENT_TIER_GRANT".to_string(),
        pass: found,
        reason: Some(
            if found {
                "PARENT_TIER_GRANT_FOUND"
            } else {
                "NO_PARENT_TIER_GRANT"
            }
            .to_string(),
        ),
    }
}

// Pass iff the subject's org holds an active org_link on the resource with the
// descriptor's role.
fn evaluate_required_role_gate(
    role: &str,
    subject_org_id: &str,
    resource: &ResolverResource,
    now: DateTime<Utc>,
) -> ResourceGateResult {
    let matches = active_org_links_for_role(&resource.org_links, role, now);
    let pass = matches.iter().any(|l| l.org_id == subject_org_id);
    ResourceGateResult {
        kind: "REQUIRED_ROLE".to_string(),
        pass,
        reason: Some(
            if pass {
                "REQUIRED_ROLE_PRESENT"
            } else {
                "MISSING_REQUIRED_ROLE"
            }
            .to_string(),
        ),
    }
}

// Gate dispatcher (evaluateGate). The Unknown arm FAILS CLOSED — never a silent
// ALLOW (T-11-04).
fn evaluate_gate(
    gate: &GateDescriptor,
    subject: &str,
    subject_clearance: &str,
    subject_org_id: &str,
    effective_class: &str,
    resource: &ResolverResource,
    grants: &[ResourceAccessGrant],
    now: DateTime<Utc>,
) -> ResourceGateResult {
    match gate {
        GateDescriptor::Clearance => evaluate_clearance_gate(subject_clearance, effective_class),
        GateDescriptor::OwnTierGrant => {
            evaluate_own_tier_grant_gate(subject, resource, grants, now)
        }
        GateDescriptor::ParentTierGrant => {
            evaluate_parent_tier_grant_gate(subject, resource, grants, now)
        }
        GateDescriptor::RequiredRole { role } => {
            evaluate_required_role_gate(role, subject_org_id, resource, now)
        }
        GateDescriptor::Unknown => ResourceGateResult {
            kind: "UNKNOWN".to_string(),
            pass: false,
            reason: Some("UNKNOWN_GATE_KIND".to_string()),
        },
    }
}

// --- Public resolver entrypoints ---

// resolveResourceAccess (model.ts:1084). Pure, explicit `now`.
//   1. select_active_policy(now) — None => fail-closed NO_ACTIVE_POLICY DENY.
//   2. effective_classification once (single-hop for Applications).
//   3. Loop policy.gates IN LIST ORDER; allow = AND of every gate.pass.
//   5. policy_version = the selected assignment's window.
#[allow(clippy::too_many_arguments)]
pub fn resolve_resource_access(
    subject: &str,
    subject_clearance: &str,
    subject_org_id: &str,
    resource: &ResolverResource,
    all_platforms: &[ResolverPlatform],
    all_grants: &[ResourceAccessGrant],
    now: DateTime<Utc>,
) -> ResourceAccessResult {
    // Step 1: select the active policy. Uncovered timestamp => fail-closed DENY.
    let assignment = match select_active_policy(&resource.policy_assignments, now) {
        Some(a) => a,
        None => {
            return ResourceAccessResult {
                allow: false,
                gates: vec![],
                zone_advisory: None,
                policy_version: None,
                reason: Some("NO_ACTIVE_POLICY".to_string()),
            };
        }
    };

    // Step 2: derive the effective classification once. A resource whose
    // classification cannot be resolved (e.g. an Application with a missing host
    // platform) fails closed: clearance_rank("") == -1, so the CLEARANCE gate
    // can never pass — never a silent ALLOW.
    let effective_class = effective_classification(resource, all_platforms).unwrap_or_default();

    // Step 3: evaluate gates in list order; allow = AND of all gate pass values.
    let gates: Vec<ResourceGateResult> = assignment
        .policy
        .gates
        .iter()
        .map(|gate| {
            evaluate_gate(
                gate,
                subject,
                subject_clearance,
                subject_org_id,
                &effective_class,
                resource,
                all_grants,
                now,
            )
        })
        .collect();
    let allow = gates.iter().all(|g| g.pass);

    // Step 4: zone advisory — stubbed to None for Phase 11 (documented
    // deviation). NEVER feeds `allow`.
    let zone_advisory = None;

    // Step 5: explainable trace with the applied policy version.
    ResourceAccessResult {
        allow,
        gates,
        zone_advisory,
        policy_version: Some(PolicyVersion {
            // PolicyVersion serializes as a naive (no-tz) ISO string for TS parity;
            // convert the DateTime<Utc> window at this output boundary.
            valid_from: assignment.valid_from.map(|d| d.naive_utc()),
            valid_until: assignment.valid_until.map(|d| d.naive_utc()),
        }),
        reason: None,
    }
}

// canIssueResourceGrant (model.ts:1163). True iff the actor org holds an active
// ADMIN org_link on the resource OR an active matching ORG delegate. Pure.
//
// NOT currently called: the HTTP write path uses role-based authz (Option B,
// 11-03 decision) instead of this org-based rule. Retained for SEED-012
// (org-based resource authz), which will wire it back in once a person→org
// linkage exists in the schema.
#[allow(dead_code)]
pub fn can_issue_resource_grant(
    actor_org_id: &str,
    resource: &ResolverResource,
    all_delegates: &[super::models::ResourceAccessDelegate],
    now: DateTime<Utc>,
) -> bool {
    // ADMIN path: an active ADMIN org_link held by the actor org.
    let admin_links = active_org_links_for_role(&resource.org_links, "ADMIN", now);
    if admin_links.iter().any(|l| l.org_id == actor_org_id) {
        return true;
    }
    // Delegate path: an active matching ORG delegate for this resource and actor.
    all_delegates.iter().any(|d| {
        d.resource_id == resource.id
            && d.delegate_type == "ORG"
            && d.delegate_org_id.as_deref() == Some(actor_org_id)
            && is_window_active(d.valid_from, d.valid_until, now)
    })
}
