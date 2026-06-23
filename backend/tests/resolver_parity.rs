// Resolver parity test (Phase 11, Plan 02 — RSRC-BE-02, D-06).
//
// Plain #[test] (NOT rocket::async_test, no DB): the resolver is pure. Loads the
// committed golden JSON emitted by the TS exporter
// (frontend/src/demo/lib/digital-resource-golden-export.test.ts) and asserts the
// ported Rust resolver produces byte-equal serde output at the SAME three fixed
// timestamps, over the SAME fixtures. Covers the two D-06 mandatory cases:
//   - inclusive policy-window boundary (valid_until == now still ALLOWs)
//   - no covering policy -> fail-closed NO_ACTIVE_POLICY DENY, empty gate set
use chrono::NaiveDateTime;
use serde_json::Value;

use janus_backend::digital_resources::models::GateDescriptor;
use janus_backend::digital_resources::models::ResourceAccessGrant;
use janus_backend::digital_resources::resolver::{
    resolve_resource_access, ResolverPolicy, ResolverPolicyAssignment, ResolverResource,
};

// Parse a fixed UTC timestamp literal into NaiveDateTime (UTC wall-clock).
fn naive(s: &str) -> NaiveDateTime {
    NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S").expect("valid fixed timestamp")
}

// Build the SAME MilNet fixture the TS exporter uses.
fn milnet_fixture() -> (ResolverResource, Vec<ResourceAccessGrant>) {
    let policy = ResolverPolicy {
        gates: vec![
            GateDescriptor::Clearance,
            GateDescriptor::OwnTierGrant,
            GateDescriptor::ParentTierGrant,
        ],
        zone_prereq_id: None,
    };
    let assignment = ResolverPolicyAssignment {
        policy,
        valid_from: Some(naive("2026-02-01T00:00:00")),
        valid_until: Some(naive("2026-02-28T23:59:59")),
    };
    let resource = ResolverResource {
        id: "rsrc-milnet".to_string(),
        tier: "NETWORK".to_string(),
        classification: Some("SECRET".to_string()),
        parent_id: None,
        org_links: vec![],
        policy_assignments: vec![assignment],
    };
    let grants = vec![ResourceAccessGrant {
        id: "g-milnet-subj1".to_string(),
        person_id: "subj-1".to_string(),
        resource_id: "rsrc-milnet".to_string(),
        valid_from: None,
        valid_until: None,
    }];
    (resource, grants)
}

fn resolve_at(now: NaiveDateTime) -> Value {
    let (resource, grants) = milnet_fixture();
    let result = resolve_resource_access(
        "subj-1",
        "SECRET",
        "MILITARY_1",
        &resource,
        &[], // no platforms (Network uses own classification)
        &grants,
        now,
    );
    serde_json::to_value(&result).expect("serde")
}

#[test]
fn resolver_parity_against_golden_fixtures() {
    let golden: Value =
        serde_json::from_str(include_str!("fixtures/resolver-golden.json")).expect("golden json");

    // Case 1 — mid-window ALLOW.
    let now_a = resolve_at(naive("2026-02-15T12:00:00"));
    assert_eq!(now_a, golden["milnet_now_a"], "mid-window ALLOW parity");

    // Case 2 — inclusive boundary: now == valid_until must still ALLOW.
    let boundary = resolve_at(naive("2026-02-28T23:59:59"));
    assert_eq!(
        boundary, golden["milnet_boundary"],
        "inclusive boundary parity"
    );
    assert_eq!(
        boundary["allow"], true,
        "boundary (valid_until == now) must ALLOW (inclusive)"
    );

    // Case 3 — before all windows: fail-closed NO_ACTIVE_POLICY DENY.
    let no_policy = resolve_at(naive("2025-06-01T00:00:00"));
    assert_eq!(no_policy, golden["no_policy_deny"], "no-policy DENY parity");
    assert_eq!(
        golden["no_policy_deny"]["allow"], false,
        "no-policy case must DENY"
    );
    assert_eq!(
        golden["no_policy_deny"]["reason"], "NO_ACTIVE_POLICY",
        "no-policy reason must be NO_ACTIVE_POLICY"
    );
}
