use rocket::serde::json::Json;
use rocket::State;
use sqlx::PgPool;

use crate::vendor_relations::models::*;
use crate::shared::response::ApiResponse;

/// List all relations for a specific vendor
#[get("/api/vendors/<vendor_id>/relations")]
pub async fn list_vendor_relations(
    db: &State<PgPool>,
    vendor_id: i32,
) -> Result<Json<ApiResponse<Vec<VendorRelation>>>, String> {
    let relations = sqlx::query_as!(
        VendorRelation,
        r#"
        SELECT id, vendor_id, related_vendor_id, related_personnel_id, 
               relation_type, notes, valid_from, valid_until, created_at, updated_at
        FROM vendor_relations
        WHERE vendor_id = $1
        ORDER BY relation_type, created_at DESC
        "#,
        vendor_id
    )
    .fetch_all(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(Json(ApiResponse::success(relations)))
}

/// Create a new vendor relation
#[post("/api/vendors/relations", data = "<data>")]
pub async fn create_vendor_relation(
    db: &State<PgPool>,
    data: Json<CreateVendorRelationRequest>,
) -> Result<Json<ApiResponse<VendorRelation>>, String> {
    // Validate that either related_vendor_id or related_personnel_id is set
    if data.related_vendor_id.is_none() && data.related_personnel_id.is_none() {
        return Err("Either related_vendor_id or related_personnel_id must be provided".to_string());
    }
    
    // Simple date parsing: YYYY-MM-DD format
    let valid_from = match &data.valid_from {
        Some(d) => chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(0, 0, 0))
            .unwrap_or_else(|| chrono::Utc::now().naive_utc()),
        None => chrono::Utc::now().naive_utc(),
    };
    
    let valid_until = data.valid_until.as_ref().and_then(|d| {
        chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(23, 59, 59))
    });
    
    let relation = sqlx::query_as!(
        VendorRelation,
        r#"
        INSERT INTO vendor_relations (vendor_id, related_vendor_id, related_personnel_id, relation_type, notes, valid_from, valid_until)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, vendor_id, related_vendor_id, related_personnel_id, 
                  relation_type, notes, valid_from, valid_until, created_at, updated_at
        "#,
        data.vendor_id,
        data.related_vendor_id,
        data.related_personnel_id,
        data.relation_type,
        data.notes,
        valid_from,
        valid_until
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(Json(ApiResponse::success(relation)))
}

/// Get vendor hierarchy using recursive CTE
#[get("/api/vendors/<vendor_id>/hierarchy")]
pub async fn get_vendor_hierarchy(
    db: &State<PgPool>,
    vendor_id: i32,
) -> Result<Json<ApiResponse<Vec<VendorHierarchy>>>, String> {
    // First, get the vendor name
    let _vendor_name = sqlx::query_scalar!(
        "SELECT company_name FROM vendors WHERE id = $1",
        vendor_id
    )
    .fetch_one(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    // Use recursive CTE to build hierarchy
    let _hierarchy_raw = sqlx::query!(
        r#"
        WITH RECURSIVE vendor_tree AS (
            -- Base case: starting vendor
            SELECT 
                vr.vendor_id,
                vr.related_vendor_id,
                v.company_name,
                vr.relation_type,
                0 as level
            FROM vendor_relations vr
            JOIN vendors v ON v.id = vr.related_vendor_id
            WHERE vr.vendor_id = $1 
            AND vr.related_vendor_id IS NOT NULL
            AND vr.relation_type IN ('sub_vendor', 'subcontractor')
            
            UNION ALL
            
            -- Recursive case: sub-vendors of sub-vendors
            SELECT 
                vr.vendor_id,
                vr.related_vendor_id,
                v.company_name,
                vr.relation_type,
                vt.level + 1
            FROM vendor_relations vr
            JOIN vendors v ON v.id = vr.related_vendor_id
            JOIN vendor_tree vt ON vr.vendor_id = vt.related_vendor_id
            WHERE vr.related_vendor_id IS NOT NULL
            AND vr.relation_type IN ('sub_vendor', 'subcontractor')
            AND vt.level < 10  -- Prevent infinite recursion
        )
        SELECT 
            vendor_id,
            related_vendor_id,
            company_name,
            relation_type,
            level
        FROM vendor_tree
        ORDER BY level, relation_type, company_name
        "#,
        vendor_id
    )
    .fetch_all(db.inner())
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    
    // Build hierarchical structure - simplified for now
    let hierarchy: Vec<VendorHierarchy> = vec![];
    
    Ok(Json(ApiResponse::success(hierarchy)))
}

/// Delete a vendor relation
#[delete("/api/vendors/relations/<relation_id>")]
pub async fn delete_vendor_relation(
    db: &State<PgPool>,
    relation_id: i32,
) -> Result<Json<ApiResponse<String>>, String> {
    sqlx::query!("DELETE FROM vendor_relations WHERE id = $1", relation_id)
        .execute(db.inner())
        .await
        .map_err(|e| format!("Database error: {}", e))?;
    
    Ok(Json(ApiResponse::success("Relation deleted successfully".to_string())))
}

