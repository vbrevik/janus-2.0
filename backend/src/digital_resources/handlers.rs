// Digital-resource HTTP handlers (Phase 11, Plan 03 — RSRC-BE-03, RSRC-BE-04).
//
// Three endpoints, all relative-path macros (domain mounted at /api/digital-resources):
//   GET  /world          — aggregate read, AuthGuard (_auth = only used for 401 rejection)
//   POST /grants         — issue a resource access grant, re-validates authority server-side
//   POST /delegates      — issue an org delegate, re-validates authority server-side
//
// Route mounts: no /api/... in macros — the mount point handles the prefix (D-09).
// All handlers return Result<Json<T>, Status>; never panic (CLAUDE.md convention).
use chrono::Utc;
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::{get, post, State};
use sqlx::PgPool;
use uuid::Uuid;

use super::models::{
    DigitalResourceWorldResponse, IssueDelegateRequest, IssueGrantRequest, ResourceAccessDelegate,
    ResourceAccessGrant, ResourceApplication, ResourceNetwork, ResourceOrgLink, ResourcePlatform,
    ResourcePolicy, ResourcePolicyAssignment,
};
use super::resolver::{
    can_issue_resource_grant, ResolverOrgLink, ResolverPolicy, ResolverPolicyAssignment,
    ResolverResource, TIER_APPLICATION, TIER_NETWORK, TIER_PLATFORM,
};
use crate::auth::middleware::AuthGuard;
use crate::shared::response::ApiResponse;

// ---------------------------------------------------------------------------
// GET /world
// ---------------------------------------------------------------------------
//
// Loads all 8 tables in 8 independent queries (no N+1 loop), assembles a
// DigitalResourceWorldResponse, and wraps it in ApiResponse::success.
// AuthGuard rejects unauthenticated callers with 401 automatically.
#[get("/world")]
pub async fn get_world(
    db: &State<PgPool>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DigitalResourceWorldResponse>>, Status> {
    // 8 parallel flat queries — load everything, assemble in memory.
    let networks: Vec<ResourceNetwork> =
        sqlx::query_as::<_, ResourceNetwork>("SELECT id, name, classification, created_at, updated_at FROM resource_networks ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_networks: {:?}", e);
                Status::InternalServerError
            })?;

    let platforms: Vec<ResourcePlatform> =
        sqlx::query_as::<_, ResourcePlatform>("SELECT id, name, classification, network_id, created_at, updated_at FROM resource_platforms ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_platforms: {:?}", e);
                Status::InternalServerError
            })?;

    let applications: Vec<ResourceApplication> =
        sqlx::query_as::<_, ResourceApplication>("SELECT id, name, platform_id, created_at, updated_at FROM resource_applications ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_applications: {:?}", e);
                Status::InternalServerError
            })?;

    let org_links: Vec<ResourceOrgLink> =
        sqlx::query_as::<_, ResourceOrgLink>("SELECT id, resource_id, resource_tier, org_id, role, valid_from, valid_until FROM resource_org_links ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_org_links: {:?}", e);
                Status::InternalServerError
            })?;

    let policies: Vec<ResourcePolicy> = sqlx::query_as::<_, ResourcePolicy>(
        "SELECT id, label, gates, zone_prereq_id FROM resource_policies ORDER BY id",
    )
    .fetch_all(db.inner())
    .await
    .map_err(|e| {
        eprintln!("DB error loading resource_policies: {:?}", e);
        Status::InternalServerError
    })?;

    let policy_assignments: Vec<ResourcePolicyAssignment> =
        sqlx::query_as::<_, ResourcePolicyAssignment>("SELECT id, resource_id, resource_tier, policy_id, valid_from, valid_until FROM resource_policy_assignments ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_policy_assignments: {:?}", e);
                Status::InternalServerError
            })?;

    let grants: Vec<ResourceAccessGrant> =
        sqlx::query_as::<_, ResourceAccessGrant>("SELECT id, person_id, resource_id, valid_from, valid_until FROM resource_access_grants ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_access_grants: {:?}", e);
                Status::InternalServerError
            })?;

    let delegates: Vec<ResourceAccessDelegate> =
        sqlx::query_as::<_, ResourceAccessDelegate>("SELECT id, resource_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until FROM resource_access_delegates ORDER BY id")
            .fetch_all(db.inner())
            .await
            .map_err(|e| {
                eprintln!("DB error loading resource_access_delegates: {:?}", e);
                Status::InternalServerError
            })?;

    let world = DigitalResourceWorldResponse {
        networks,
        platforms,
        applications,
        org_links,
        policies,
        policy_assignments,
        grants,
        delegates,
    };

    Ok(Json(ApiResponse::success(world)))
}

// ---------------------------------------------------------------------------
// POST /grants
// ---------------------------------------------------------------------------
//
// Validates issuing authority server-side before persisting.
// Sequence (RSRC-BE-04 / T-11-08):
//   1. Derive `now` at the HTTP edge (NOT inside the resolver — determinism).
//   2. Load the resource's org_links + policy_assignments from DB to build a ResolverResource.
//   3. Load all delegates for the resource from DB.
//   4. Call can_issue_resource_grant — on false return 403 immediately.
//   5. INSERT ... ON CONFLICT DO NOTHING (idempotent — uq_grant / T-11-11).
//   6. Return the persisted row (or the existing row if it was a duplicate).
#[post("/grants", data = "<body>")]
pub async fn issue_grant(
    body: Json<IssueGrantRequest>,
    db: &State<PgPool>,
    auth: AuthGuard,
) -> Result<Json<ApiResponse<ResourceAccessGrant>>, Status> {
    let _ = &auth; // AuthGuard already asserts authentication; sub not needed for this endpoint.
    let now = Utc::now().naive_utc();
    let data = body.into_inner();

    // Build a ResolverResource for the requested resource_id (may be network, platform, or app).
    let resolver_resource = build_resolver_resource(&data.resource_id, db.inner()).await?;

    // Load all delegates for this resource.
    let delegates: Vec<ResourceAccessDelegate> = sqlx::query_as::<_, ResourceAccessDelegate>(
        "SELECT id, resource_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until \
         FROM resource_access_delegates WHERE resource_id = $1",
    )
    .bind(&data.resource_id)
    .fetch_all(db.inner())
    .await
    .map_err(|e| {
        eprintln!("DB error loading delegates for issue_grant: {:?}", e);
        Status::InternalServerError
    })?;

    // Server-side authority re-validation (T-11-08 — never trust the client's say-so).
    if !can_issue_resource_grant(&data.actor_org_id, &resolver_resource, &delegates, now) {
        return Err(Status::Forbidden);
    }

    // Generate a deterministic-enough TEXT id for the grant.
    let grant_id = Uuid::new_v4().to_string();

    // INSERT ... ON CONFLICT DO NOTHING for idempotency (uq_grant constraint covers the
    // natural key person_id + resource_id + valid_from + valid_until — T-11-11).
    // Because ON CONFLICT DO NOTHING returns no row on conflict, we SELECT after to return
    // the (existing or new) row.
    sqlx::query(
        "INSERT INTO resource_access_grants (id, person_id, resource_id, valid_from, valid_until) \
         VALUES ($1, $2, $3, $4, $5) \
         ON CONFLICT (person_id, resource_id, valid_from, valid_until) DO NOTHING",
    )
    .bind(&grant_id)
    .bind(&data.person_id)
    .bind(&data.resource_id)
    .bind(data.valid_from)
    .bind(data.valid_until)
    .execute(db.inner())
    .await
    .map_err(|e| {
        eprintln!("DB error inserting resource_access_grant: {:?}", e);
        Status::InternalServerError
    })?;

    // Fetch the canonical row (handles the duplicate-no-new-row case).
    let grant: ResourceAccessGrant = sqlx::query_as::<_, ResourceAccessGrant>(
        "SELECT id, person_id, resource_id, valid_from, valid_until \
         FROM resource_access_grants \
         WHERE person_id = $1 AND resource_id = $2 \
           AND (valid_from IS NOT DISTINCT FROM $3) \
           AND (valid_until IS NOT DISTINCT FROM $4) \
         LIMIT 1",
    )
    .bind(&data.person_id)
    .bind(&data.resource_id)
    .bind(data.valid_from)
    .bind(data.valid_until)
    .fetch_optional(db.inner())
    .await
    .map_err(|e| {
        eprintln!(
            "DB error fetching resource_access_grant after insert: {:?}",
            e
        );
        Status::InternalServerError
    })?
    .ok_or(Status::InternalServerError)?;

    Ok(Json(ApiResponse::success(grant)))
}

// ---------------------------------------------------------------------------
// POST /delegates
// ---------------------------------------------------------------------------
//
// Same validate-then-insert pattern as issue_grant.  ON CONFLICT DO NOTHING on
// the delegate natural key (resource_id, delegate_type, delegate_person_id,
// delegate_org_id, granted_by_org_id).
#[post("/delegates", data = "<body>")]
pub async fn issue_delegate(
    body: Json<IssueDelegateRequest>,
    db: &State<PgPool>,
    auth: AuthGuard,
) -> Result<Json<ApiResponse<ResourceAccessDelegate>>, Status> {
    let _ = &auth;
    let now = Utc::now().naive_utc();
    let data = body.into_inner();

    // Build a ResolverResource for authority check.
    let resolver_resource = build_resolver_resource(&data.resource_id, db.inner()).await?;

    // Load all delegates for this resource (for the authority check).
    let delegates: Vec<ResourceAccessDelegate> = sqlx::query_as::<_, ResourceAccessDelegate>(
        "SELECT id, resource_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until \
         FROM resource_access_delegates WHERE resource_id = $1",
    )
    .bind(&data.resource_id)
    .fetch_all(db.inner())
    .await
    .map_err(|e| {
        eprintln!("DB error loading delegates for issue_delegate: {:?}", e);
        Status::InternalServerError
    })?;

    // Server-side authority re-validation.
    if !can_issue_resource_grant(&data.granted_by_org_id, &resolver_resource, &delegates, now) {
        return Err(Status::Forbidden);
    }

    let delegate_id = Uuid::new_v4().to_string();

    // Idempotent insert via WHERE NOT EXISTS on the natural key
    // (resource_access_delegates has no UNIQUE constraint, so we use this pattern).
    sqlx::query(
        "INSERT INTO resource_access_delegates \
           (id, resource_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until) \
         SELECT $1, $2, $3, $4, $5, $6, $7, $8 \
         WHERE NOT EXISTS ( \
           SELECT 1 FROM resource_access_delegates \
           WHERE resource_id = $2 AND delegate_type = $3 \
             AND (delegate_person_id IS NOT DISTINCT FROM $4) \
             AND (delegate_org_id IS NOT DISTINCT FROM $5) \
             AND granted_by_org_id = $6 \
         )",
    )
    .bind(&delegate_id)
    .bind(&data.resource_id)
    .bind(&data.delegate_type)
    .bind(&data.delegate_person_id)
    .bind(&data.delegate_org_id)
    .bind(&data.granted_by_org_id)
    .bind(data.valid_from)
    .bind(data.valid_until)
    .execute(db.inner())
    .await
    .map_err(|e| {
        eprintln!("DB error inserting resource_access_delegate: {:?}", e);
        Status::InternalServerError
    })?;

    // Fetch the canonical row.
    let delegate: ResourceAccessDelegate = sqlx::query_as::<_, ResourceAccessDelegate>(
        "SELECT id, resource_id, delegate_type, delegate_person_id, delegate_org_id, granted_by_org_id, valid_from, valid_until \
         FROM resource_access_delegates \
         WHERE resource_id = $1 AND delegate_type = $2 \
           AND (delegate_person_id IS NOT DISTINCT FROM $3) \
           AND (delegate_org_id IS NOT DISTINCT FROM $4) \
           AND granted_by_org_id = $5 \
         LIMIT 1",
    )
    .bind(&data.resource_id)
    .bind(&data.delegate_type)
    .bind(&data.delegate_person_id)
    .bind(&data.delegate_org_id)
    .bind(&data.granted_by_org_id)
    .fetch_optional(db.inner())
    .await
    .map_err(|e| {
        eprintln!("DB error fetching resource_access_delegate after insert: {:?}", e);
        Status::InternalServerError
    })?
    .ok_or(Status::InternalServerError)?;

    Ok(Json(ApiResponse::success(delegate)))
}

// ---------------------------------------------------------------------------
// Helper: build a ResolverResource for a given resource_id
// ---------------------------------------------------------------------------
//
// Determines the tier from which table the id appears in, then loads its
// org_links and policy_assignments + policies from the DB.
// Returns 404 if the id is unknown across all three tiers.
async fn build_resolver_resource(
    resource_id: &str,
    pool: &PgPool,
) -> Result<ResolverResource, Status> {
    // Determine tier by probing each table.
    let (tier, classification, parent_id): (String, Option<String>, Option<String>) =
        if let Some(row) = sqlx::query_as::<_, (String, String)>(
            "SELECT id, classification FROM resource_networks WHERE id = $1",
        )
        .bind(resource_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| Status::InternalServerError)?
        {
            (TIER_NETWORK.to_string(), Some(row.1), None)
        } else if let Some(row) = sqlx::query_as::<_, (String, String, String)>(
            "SELECT id, classification, network_id FROM resource_platforms WHERE id = $1",
        )
        .bind(resource_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| Status::InternalServerError)?
        {
            (TIER_PLATFORM.to_string(), Some(row.1), Some(row.2))
        } else if let Some(row) = sqlx::query_as::<_, (String, String)>(
            "SELECT id, platform_id FROM resource_applications WHERE id = $1",
        )
        .bind(resource_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| Status::InternalServerError)?
        {
            (TIER_APPLICATION.to_string(), None, Some(row.1))
        } else {
            return Err(Status::NotFound);
        };

    // Load org_links for this resource.
    let raw_links: Vec<(String, String, Option<chrono::NaiveDateTime>, Option<chrono::NaiveDateTime>)> =
        sqlx::query_as(
            "SELECT org_id, role, valid_from, valid_until FROM resource_org_links WHERE resource_id = $1",
        )
        .bind(resource_id)
        .fetch_all(pool)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let org_links: Vec<ResolverOrgLink> = raw_links
        .into_iter()
        .map(|(org_id, role, valid_from, valid_until)| ResolverOrgLink {
            org_id,
            role,
            valid_from,
            valid_until,
        })
        .collect();

    // Load policy_assignments + join policy for gates.
    let raw_assignments: Vec<(
        String,
        serde_json::Value,
        Option<String>,
        Option<chrono::NaiveDateTime>,
        Option<chrono::NaiveDateTime>,
    )> = sqlx::query_as(
        "SELECT p.id, p.gates, p.zone_prereq_id, pa.valid_from, pa.valid_until \
         FROM resource_policy_assignments pa \
         JOIN resource_policies p ON p.id = pa.policy_id \
         WHERE pa.resource_id = $1 \
         ORDER BY pa.id",
    )
    .bind(resource_id)
    .fetch_all(pool)
    .await
    .map_err(|_| Status::InternalServerError)?;

    let policy_assignments: Vec<ResolverPolicyAssignment> = raw_assignments
        .into_iter()
        .map(
            |(_pol_id, gates_json, zone_prereq_id, valid_from, valid_until)| {
                let gates: Vec<super::models::GateDescriptor> =
                    serde_json::from_value(gates_json).unwrap_or_default();
                ResolverPolicyAssignment {
                    policy: ResolverPolicy {
                        gates,
                        zone_prereq_id,
                    },
                    valid_from,
                    valid_until,
                }
            },
        )
        .collect();

    Ok(ResolverResource {
        id: resource_id.to_string(),
        tier,
        classification,
        parent_id,
        org_links,
        policy_assignments,
    })
}
