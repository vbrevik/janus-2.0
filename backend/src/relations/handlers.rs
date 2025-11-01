use rocket::{serde::json::Json, State, get, post, put, delete};
use rocket::http::Status;
use sqlx::PgPool;
use chrono::Utc;
use validator::Validate;

use crate::relations::models::*;
use crate::auth::middleware::AuthGuard;

/// List all relations for a specific entity (both incoming and outgoing)
#[get("/relations?<entity_type>&<entity_id>&<direction>")]
pub async fn list_relations(
    db: &State<PgPool>,
    entity_type: String,
    entity_id: i32,
    direction: Option<String>, // 'outgoing' (default), 'incoming', or 'both'
    _auth: AuthGuard,
) -> Result<Json<Vec<RelationWithNames>>, Status> {
    // Validate entity_type
    if entity_type != "person" && entity_type != "organization" {
        return Err(Status::BadRequest);
    }
    
    let dir = direction.as_deref().unwrap_or("outgoing");

    let relations = match dir {
        "incoming" => {
            sqlx::query_as::<sqlx::Postgres, Relation>(
                r#"
                SELECT id, entity_type, entity_id, related_entity_type, related_entity_id,
                       relation_type, notes, valid_from, valid_until, created_at, updated_at
                FROM relations
                WHERE related_entity_type = $1 AND related_entity_id = $2
                ORDER BY relation_type, created_at DESC
                "#
            )
            .bind(&entity_type)
            .bind(entity_id)
            .fetch_all(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
        },
        "both" => {
            sqlx::query_as::<sqlx::Postgres, Relation>(
                r#"
                SELECT id, entity_type, entity_id, related_entity_type, related_entity_id,
                       relation_type, notes, valid_from, valid_until, created_at, updated_at
                FROM relations
                WHERE (entity_type = $1 AND entity_id = $2) 
                   OR (related_entity_type = $1 AND related_entity_id = $2)
                ORDER BY relation_type, created_at DESC
                "#
            )
            .bind(&entity_type)
            .bind(entity_id)
            .fetch_all(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
        },
        _ => { // "outgoing" or default
            sqlx::query_as::<sqlx::Postgres, Relation>(
                r#"
                SELECT id, entity_type, entity_id, related_entity_type, related_entity_id,
                       relation_type, notes, valid_from, valid_until, created_at, updated_at
                FROM relations
                WHERE entity_type = $1 AND entity_id = $2
                ORDER BY relation_type, created_at DESC
                "#
            )
            .bind(&entity_type)
            .bind(entity_id)
            .fetch_all(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
        }
    };

    // Get entity names
    let mut relations_with_names = Vec::new();
    for rel in relations {
        let entity_name: String = if rel.entity_type == "person" {
            sqlx::query_scalar::<_, String>(
                "SELECT COALESCE(CONCAT(first_name, ' ', last_name), username, email, 'Person #' || id::text) FROM person WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(rel.entity_id)
            .fetch_optional(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or_else(|| format!("Person #{}", rel.entity_id))
        } else {
            sqlx::query_scalar::<_, String>(
                "SELECT company_name FROM vendors WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(rel.entity_id)
            .fetch_optional(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or_else(|| format!("Vendor #{}", rel.entity_id))
        };

        let related_entity_name: String = if rel.related_entity_type == "person" {
            sqlx::query_scalar::<_, String>(
                "SELECT COALESCE(CONCAT(first_name, ' ', last_name), username, email, 'Person #' || id::text) FROM person WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(rel.related_entity_id)
            .fetch_optional(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or_else(|| format!("Person #{}", rel.related_entity_id))
        } else {
            sqlx::query_scalar::<_, String>(
                "SELECT company_name FROM vendors WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(rel.related_entity_id)
            .fetch_optional(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or_else(|| format!("Vendor #{}", rel.related_entity_id))
        };

        relations_with_names.push(RelationWithNames {
            relation: rel,
            entity_name,
            related_entity_name,
        });
    }

    Ok(Json(relations_with_names))
}

/// Get relations for a specific person
#[get("/persons/<person_id>/relations?<direction>")]
pub async fn list_person_relations(
    db: &State<PgPool>,
    person_id: i32, // Changed from personnel_id
    direction: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<Vec<RelationWithNames>>, Status> {
    list_relations(db, "person".to_string(), person_id, direction, _auth).await
}

/// Get relations for a specific vendor
#[get("/vendors/<vendor_id>/relations?<direction>")]
pub async fn list_vendor_relations(
    db: &State<PgPool>,
    vendor_id: i32,
    direction: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<Vec<RelationWithNames>>, Status> {
    list_relations(db, "vendor".to_string(), vendor_id, direction, _auth).await
}

/// Create a new relation
#[post("/relations", data = "<data>")]
pub async fn create_relation(
    db: &State<PgPool>,
    data: Json<CreateRelationRequest>,
    _auth: AuthGuard,
) -> Result<Json<Relation>, Status> {
    data.0.validate().map_err(|_| Status::BadRequest)?;

    // Validate entity types
    if data.entity_type != "person" && data.entity_type != "organization" {
        return Err(Status::BadRequest);
    }
    if data.related_entity_type != "person" && data.related_entity_type != "organization" {
        return Err(Status::BadRequest);
    }

    // Parse dates
    let valid_from = match &data.valid_from {
        Some(d) => chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(0, 0, 0))
            .unwrap_or_else(|| Utc::now().naive_utc()),
        None => Utc::now().naive_utc(),
    };

    let valid_until = data.valid_until.as_ref().and_then(|d| {
        chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(23, 59, 59))
    });

    let relation = sqlx::query_as::<sqlx::Postgres, Relation>(
        r#"
        INSERT INTO relations 
        (entity_type, entity_id, related_entity_type, related_entity_id, relation_type, notes, valid_from, valid_until)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, entity_type, entity_id, related_entity_type, related_entity_id,
                  relation_type, notes, valid_from, valid_until, created_at, updated_at
        "#
    )
    .bind(&data.entity_type)
    .bind(data.entity_id)
    .bind(&data.related_entity_type)
    .bind(data.related_entity_id)
    .bind(&data.relation_type)
    .bind(data.notes.as_deref())
    .bind(valid_from)
    .bind(valid_until)
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    Ok(Json(relation))
}

/// Get hierarchical structure (recursive) - supports both vendor and person hierarchies
#[get("/relations/hierarchy?<entity_type>&<entity_id>&<relation_type>")]
pub async fn get_hierarchy(
    db: &State<PgPool>,
    entity_type: String,
    entity_id: i32,
    relation_type: Option<String>, // e.g., 'sub_vendor', 'subordinate', 'reports_to'
    _auth: AuthGuard,
) -> Result<Json<Vec<EntityHierarchy>>, Status> {
    // Validate entity_type
    if entity_type != "person" && entity_type != "organization" {
        return Err(Status::BadRequest);
    }

    let rel_type_filter = relation_type.as_deref().unwrap_or("%");

    // Determine which relation types are hierarchical based on entity type
    // For vendors: sub_vendor, subcontractor
    // For person: subordinate, reports_to, team_member
    let _hierarchical_relation_types = if entity_type == "organization" {
        vec!["sub_vendor", "subcontractor"]
    } else {
        vec!["subordinate", "reports_to", "team_member"]
    };

    // Use recursive CTE to build hierarchy - works for both vendor and person
    let hierarchy_raw = sqlx::query!(
        r#"
        WITH RECURSIVE entity_tree AS (
            -- Base case: starting entity's direct relations
            SELECT 
                r.related_entity_id as entity_id,
                r.related_entity_type as entity_type,
                r.relation_type,
                0 as level
            FROM relations r
            WHERE r.entity_type = $1 
            AND r.entity_id = $2
            AND r.related_entity_type = $1  -- Same entity type for hierarchical relations
            AND (
                ($1 = 'organization' AND r.relation_type IN ('sub_vendor', 'subcontractor')) OR
                ($1 = 'person' AND r.relation_type IN ('subordinate', 'reports_to', 'team_member'))
            )
            AND r.relation_type LIKE $3
            
            UNION ALL
            
            -- Recursive case: children of children
            SELECT 
                r.related_entity_id as entity_id,
                r.related_entity_type as entity_type,
                r.relation_type,
                et.level + 1
            FROM relations r
            JOIN entity_tree et ON r.entity_type = et.entity_type AND r.entity_id = et.entity_id
            WHERE r.related_entity_type = $1  -- Same entity type for hierarchical relations
            AND (
                ($1 = 'organization' AND r.relation_type IN ('sub_vendor', 'subcontractor')) OR
                ($1 = 'person' AND r.relation_type IN ('subordinate', 'reports_to', 'team_member'))
            )
            AND r.relation_type LIKE $3
            AND et.level < 10  -- Prevent infinite recursion
        )
        SELECT 
            entity_id,
            entity_type,
            relation_type,
            level
        FROM entity_tree
        ORDER BY level, relation_type
        "#,
        entity_type,
        entity_id,
        rel_type_filter
    )
    .fetch_all(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?;

    // Build hierarchical structure with names (organized by level and parent-child relationships)
    let mut hierarchy_map: std::collections::HashMap<i32, EntityHierarchy> = std::collections::HashMap::new();
    
    for row in hierarchy_raw {
        let entity_type_str = row.entity_type.as_deref().unwrap_or(&entity_type);
        let entity_name: String = if entity_type_str == "person" {
            sqlx::query_scalar::<_, String>(
                "SELECT COALESCE(CONCAT(first_name, ' ', last_name), username, email, 'Person #' || id::text) FROM person WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(row.entity_id.unwrap_or(0))
            .fetch_optional(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or_else(|| format!("Person #{}", row.entity_id.unwrap_or(0)))
        } else {
            sqlx::query_scalar::<_, String>(
                "SELECT company_name FROM vendors WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(row.entity_id.unwrap_or(0))
            .fetch_optional(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?
            .unwrap_or_else(|| format!("Vendor #{}", row.entity_id.unwrap_or(0)))
        };

        let entity_id_val = row.entity_id.unwrap_or(0);
        hierarchy_map.insert(entity_id_val, EntityHierarchy {
            entity_id: entity_id_val,
            entity_type: entity_type_str.to_string(),
            entity_name,
            relation_type: row.relation_type.unwrap_or_default(),
            level: row.level.unwrap_or(0),
            children: Vec::new(),
        });
    }

    // Convert map to vector, sorted by level
    let mut hierarchy: Vec<EntityHierarchy> = hierarchy_map.into_values().collect();
    hierarchy.sort_by(|a, b| a.level.cmp(&b.level).then_with(|| a.entity_name.cmp(&b.entity_name)));

    Ok(Json(hierarchy))
}

/// Update a relation
#[put("/relations/<id>", data = "<data>")]
pub async fn update_relation(
    db: &State<PgPool>,
    id: i32,
    data: Json<UpdateRelationRequest>,
    _auth: AuthGuard,
) -> Result<Json<Relation>, Status> {
    data.0.validate().map_err(|_| Status::BadRequest)?;

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut param_count = 1;

    if data.relation_type.is_some() {
        updates.push(format!("relation_type = ${}", param_count));
        param_count += 1;
    }
    if data.notes.is_some() {
        updates.push(format!("notes = ${}", param_count));
        param_count += 1;
    }
    if data.valid_from.is_some() {
        updates.push(format!("valid_from = ${}", param_count));
        param_count += 1;
    }
    if data.valid_until.is_some() {
        updates.push(format!("valid_until = ${}", param_count));
        param_count += 1;
    }

    if updates.is_empty() {
        return Err(Status::BadRequest);
    }

    let query = format!(
        "UPDATE relations SET updated_at = CURRENT_TIMESTAMP, {} WHERE id = ${} RETURNING *",
        updates.join(", "),
        param_count
    );

    let mut query_builder = sqlx::query_as::<_, Relation>(&query);
    
    if let Some(ref relation_type) = data.relation_type {
        query_builder = query_builder.bind(relation_type);
    }
    if let Some(ref notes) = data.notes {
        query_builder = query_builder.bind(notes);
    }
    if let Some(ref valid_from_str) = data.valid_from {
        let valid_from = chrono::NaiveDate::parse_from_str(valid_from_str, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(0, 0, 0))
            .unwrap_or_else(|| Utc::now().naive_utc());
        query_builder = query_builder.bind(valid_from);
    }
    if let Some(ref valid_until_str) = data.valid_until {
        let valid_until = chrono::NaiveDate::parse_from_str(valid_until_str, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(23, 59, 59));
        query_builder = query_builder.bind(valid_until);
    }
    
    query_builder = query_builder.bind(id);

    let relation = query_builder
        .fetch_one(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?;

    Ok(Json(relation))
}

/// Delete a relation
#[delete("/relations/<id>")]
pub async fn delete_relation(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<&'static str>, Status> {
    sqlx::query("DELETE FROM relations WHERE id = $1")
        .bind(id)
        .execute(db.inner())
            .await
            .map_err(|_| Status::InternalServerError)?;

    Ok(Json("Relation deleted successfully"))
}

