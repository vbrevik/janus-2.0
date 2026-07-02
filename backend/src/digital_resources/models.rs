// Digital-resource domain models (Phase 11, Plan 02).
//
// Eight sqlx::FromRow structs mirror the 8 tables created in Plan 01 (TEXT PKs
// for the resource entities, SERIAL i32 for the two link/assignment tables).
// The GateDescriptor enum is a tagged union mirroring the TS `GateDescriptor`
// in frontend/src/demo/lib/model.ts; its `#[serde(other)] Unknown` arm is the
// fail-closed sink for any injected/unknown gate kind (T-11-04). The resolver
// output structs (ResourceGateResult / PolicyVersion / ResourceAccessResult)
// are serde-shaped for byte-parity with the TS resolver's output.
//
// TIMESTAMPTZ note: all timestamp columns in the Plan 01 tables use TIMESTAMPTZ.
// sqlx decodes them as chrono::DateTime<Utc>, and the resolver (Plan 03) uses
// DateTime<Utc> throughout — so handlers pass DB timestamps straight through with
// no conversion. The ONE exception is PolicyVersion below: it is a serialization
// shape matched byte-for-byte to the TS exporter's `policyVersion`, which emits a
// naive (no-tz) ISO string. It therefore stays NaiveDateTime and the resolver
// converts via .naive_utc() at that boundary.
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// --- 8 sqlx domain structs (1:1 with the Plan 01 tables) ---

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourceNetwork {
    pub id: String,
    pub name: String,
    pub classification: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourcePlatform {
    pub id: String,
    pub name: String,
    pub classification: String,
    pub network_id: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

// Application has NO classification column — derived from the parent platform at
// resolution time (anti-pattern 2 / RSRC-02).
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourceApplication {
    pub id: String,
    pub name: String,
    pub platform_id: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

// SERIAL PK — no natural text id.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourceOrgLink {
    pub id: i32,
    pub resource_id: String,
    pub resource_tier: String,
    pub org_id: String,
    pub role: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourcePolicy {
    pub id: String,
    pub label: String,
    pub gates: serde_json::Value,
    pub zone_prereq_id: Option<String>,
}

// SERIAL PK.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourcePolicyAssignment {
    pub id: i32,
    pub resource_id: String,
    pub resource_tier: String,
    pub policy_id: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourceAccessGrant {
    pub id: String,
    pub person_id: String,
    pub resource_id: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResourceAccessDelegate {
    pub id: String,
    pub resource_id: String,
    pub delegate_type: String,
    pub delegate_person_id: Option<String>,
    pub delegate_org_id: Option<String>,
    pub granted_by_org_id: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

// --- Request structs (Plan 03 handlers consume these) ---

#[derive(Debug, Deserialize)]
pub struct IssueGrantRequest {
    pub resource_id: String,
    pub person_id: String,
    pub actor_org_id: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct IssueDelegateRequest {
    pub resource_id: String,
    pub delegate_type: String,
    pub delegate_person_id: Option<String>,
    pub delegate_org_id: Option<String>,
    pub granted_by_org_id: String,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
}

// --- Aggregate response (no FromRow — assembled in the handler) ---

#[derive(Debug, Serialize)]
pub struct DigitalResourceWorldResponse {
    pub networks: Vec<ResourceNetwork>,
    pub platforms: Vec<ResourcePlatform>,
    pub applications: Vec<ResourceApplication>,
    pub org_links: Vec<ResourceOrgLink>,
    pub policies: Vec<ResourcePolicy>,
    pub policy_assignments: Vec<ResourcePolicyAssignment>,
    pub grants: Vec<ResourceAccessGrant>,
    pub delegates: Vec<ResourceAccessDelegate>,
}

// --- GateDescriptor: tagged union mirroring TS, fail-closed Unknown arm ---
//
// Mirrors frontend/src/demo/lib/model.ts `GateDescriptor`. Baseline kinds carry
// no params; REQUIRED_ROLE carries `role`. Any unrecognized `kind` deserializes
// to Unknown (never an error), which the resolver turns into a DENY (T-11-04).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "kind")]
pub enum GateDescriptor {
    #[serde(rename = "CLEARANCE")]
    Clearance,
    #[serde(rename = "OWN_TIER_GRANT")]
    OwnTierGrant,
    #[serde(rename = "PARENT_TIER_GRANT")]
    ParentTierGrant,
    #[serde(rename = "REQUIRED_ROLE")]
    RequiredRole { role: String },
    #[serde(other)]
    Unknown,
}

// --- Resolver output structs (serde-parity with the TS resolver output) ---

// Per-gate trace entry. `reason` is omitted when None (skip_serializing_if),
// matching the TS shape where reason is always a string on real gate results
// but the field is option-shaped on the Rust side for the fail-closed paths.
#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceGateResult {
    pub kind: String,
    pub pass: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

// The selected assignment's window. Serializes nulls explicitly (no skip) to
// match the TS `policyVersion: { valid_from, valid_until }` shape.
#[derive(Debug, Serialize, Deserialize)]
pub struct PolicyVersion {
    pub valid_from: Option<chrono::NaiveDateTime>,
    pub valid_until: Option<chrono::NaiveDateTime>,
}

// Explainable resolver result. `reason` only present on the NO_ACTIVE_POLICY
// fail-closed DENY (skip_serializing_if). `policy_version` is null when no
// policy covered the timestamp. `zone_advisory` is advisory-only and never
// feeds `allow`.
#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceAccessResult {
    pub allow: bool,
    pub gates: Vec<ResourceGateResult>,
    pub zone_advisory: Option<serde_json::Value>,
    pub policy_version: Option<PolicyVersion>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}
