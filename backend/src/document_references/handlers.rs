use rocket::serde::json::Json;
use rocket::State;
use rocket::{get, post, put, delete};
use sqlx::PgPool;

use crate::document_references::models::*;
use crate::shared::response::ApiResponse;
use crate::shared::error::AppError;
use crate::auth::middleware::AuthGuard;
use validator::Validate;
use base64::Engine as _;
use s3::{Bucket, Region};
use s3::creds::Credentials;

/// List document references for a personnel
#[get("/?<personnel_id>&<document_type>&<status>")]
pub async fn list_document_references(
    db: &State<PgPool>,
    personnel_id: Option<i32>,
    document_type: Option<String>,
    status: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<Vec<DocumentReference>>>, AppError> {
    // Query shape reference (intentionally unused): kept for documentation of selected columns
    let _ = "SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE 1=1";

    // Use query_as! macro which is easier to work with
    let documents = if let Some(pid) = personnel_id {
        // Clone to avoid move issues
        let doc_type_str = document_type.as_ref().map(|s| s.as_str());
        let status_str = status.as_ref().map(|s| s.as_str());
        
        if let (Some(t), Some(s)) = (doc_type_str, status_str) {
            sqlx::query_as!(
                DocumentReference,
                "SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE personnel_id = $1 AND document_type = $2 AND status = $3 ORDER BY issued_date DESC NULLS LAST, created_at DESC",
                pid, t, s
            )
            .fetch_all(db.inner())
            .await
        } else if let Some(t) = doc_type_str {
            sqlx::query_as!(
                DocumentReference,
                "SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE personnel_id = $1 AND document_type = $2 ORDER BY issued_date DESC NULLS LAST, created_at DESC",
                pid, t
            )
            .fetch_all(db.inner())
            .await
        } else if let Some(s) = status_str {
            sqlx::query_as!(
                DocumentReference,
                "SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE personnel_id = $1 AND status = $2 ORDER BY issued_date DESC NULLS LAST, created_at DESC",
                pid, s
            )
            .fetch_all(db.inner())
            .await
        } else {
            sqlx::query_as!(
                DocumentReference,
                "SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE personnel_id = $1 ORDER BY issued_date DESC NULLS LAST, created_at DESC",
                pid
            )
            .fetch_all(db.inner())
            .await
        }
    } else {
        sqlx::query_as!(
            DocumentReference,
            "SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references ORDER BY issued_date DESC NULLS LAST, created_at DESC"
        )
        .fetch_all(db.inner())
        .await
    };

    let documents = documents?;
    Ok(Json(ApiResponse::success(documents)))
}

/// Get a specific document reference
#[get("/<id>")]
pub async fn get_document_reference(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DocumentReference>>, AppError> {
    let doc = sqlx::query_as!(
        DocumentReference,
        r#"
        SELECT id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        FROM document_references
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(doc)))
}

/// Create a new document reference (self-report)
#[post("/", data = "<data>")]
pub async fn create_document_reference(
    db: &State<PgPool>,
    data: Json<CreateDocumentReferenceRequest>,
    auth: AuthGuard,
) -> Result<Json<ApiResponse<DocumentReference>>, AppError> {
    let user_id = auth.claims.sub.parse::<i32>().unwrap_or(0);
    
    // Get personnel_id from user (similar to discussions)
    let user = sqlx::query!(
        "SELECT username FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(db.inner())
    .await?
    .ok_or(AppError::NotFound)?;

    // Find linked personnel by email matching username
    // Try multiple matching strategies:
    // 1. username% - matches if email starts with username (e.g., "johndoe" matches "johndoe@...")
    // 2. username.% - matches if email starts with username followed by dot (e.g., "john" matches "john.doe@...")
    // 3. If username is long (5+ chars), try splitting it and adding a dot (e.g., "johndoe" -> "john.doe")
    
    let pattern1 = format!("{}%", user.username);
    let pattern2 = format!("{}.%", user.username);
    
    // Try splitting long usernames (assume compound like "johndoe" -> "john.doe")
    let pattern3 = if user.username.len() >= 5 {
        let mid = user.username.len() / 2;
        Some(format!("{}.{}%", &user.username[..mid], &user.username[mid..]))
    } else {
        None
    };
    
    let personnel_id = if let Some(p3) = pattern3 {
        sqlx::query_scalar!(
            "SELECT id FROM personnel WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3 LIMIT 1",
            pattern1,
            pattern2,
            p3
        )
        .fetch_optional(db.inner())
        .await?
    } else {
        sqlx::query_scalar!(
            "SELECT id FROM personnel WHERE email LIKE $1 OR email LIKE $2 LIMIT 1",
            pattern1,
            pattern2
        )
        .fetch_optional(db.inner())
        .await?
    };

    // If personnel not found, require personnel_id to be found - this is expected behavior for self-reporting
    let personnel_id = personnel_id.ok_or_else(|| {
        eprintln!("Personnel not found for user: {}", user.username);
        AppError::NotFound
    })?;
    let document_type = data.document_type.clone().unwrap_or_else(|| "security_brief".to_string());

    let issued_date = match &data.issued_date {
        Some(d) => chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok(),
        None => None,
    };

    let doc = sqlx::query_as!(
        DocumentReference,
        r#"
        INSERT INTO document_references (personnel_id, title, document_type, description, issued_date, location, self_reported_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        "#,
        personnel_id,
        data.title,
        document_type,
        data.description,
        issued_date,
        data.location,
        user_id,
        data.notes
    )
    .fetch_one(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(doc)))
}

/// Update document reference (end-user can update their own, admin can verify)
#[put("/<id>", data = "<data>")]
pub async fn update_document_reference(
    db: &State<PgPool>,
    id: i32,
    data: Json<UpdateDocumentReferenceRequest>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DocumentReference>>, AppError> {
    let doc = sqlx::query_as!(
        DocumentReference,
        r#"
        UPDATE document_references
        SET title = COALESCE($1, title),
            document_type = COALESCE($2, document_type),
            description = COALESCE($3, description),
            issued_date = COALESCE($4::date, issued_date),
            location = COALESCE($5, location),
            status = COALESCE($6, status),
            notes = COALESCE($7, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        "#,
        data.title.as_ref(),
        data.document_type.as_ref(),
        data.description.as_ref(),
        data.issued_date.as_ref().and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok()),
        data.location.as_ref(),
        data.status.as_ref(),
        data.notes.as_ref(),
        id
    )
    .fetch_one(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(doc)))
}
/// Upload an attachment for a document reference (PDF/image as base64)
#[post("/<id>/attachment", data = "<data>")]
pub async fn upload_document_attachment(
    db: &State<PgPool>,
    id: i32,
    data: Json<AttachmentUploadRequest>,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<DocumentReference>>, AppError> {
    data.0.validate().map_err(AppError::from)?;

    // Decode base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data.data_base64)
        .map_err(|_| AppError::BadRequest)?;

    // MinIO configuration from environment
    let endpoint = std::env::var("MINIO_ENDPOINT").unwrap_or_else(|_| "http://localhost:9000".to_string());
    let access_key = std::env::var("MINIO_ACCESS_KEY").unwrap_or_else(|_| "janusminio".to_string());
    let secret_key = std::env::var("MINIO_SECRET_KEY").unwrap_or_else(|_| "janusminio_password".to_string());
    let bucket_name = std::env::var("MINIO_BUCKET").unwrap_or_else(|_| "janus-documents".to_string());
    let region = std::env::var("MINIO_REGION").unwrap_or_else(|_| "us-east-1".to_string());

    // Create credentials and bucket
    let credentials = Credentials::new(
        Some(&access_key),
        Some(&secret_key),
        None,
        None,
        None,
    ).map_err(|_| AppError::Internal)?;

    let region = Region::Custom { region: region.clone(), endpoint: endpoint.clone() };
    let bucket = Bucket::new(&bucket_name, region, credentials)
        .map_err(|_| AppError::Internal)?
        .with_path_style();

    // Upload file to MinIO
    let sanitized = data.filename.replace('/', "_");
    let key = format!("document_references/{}/{}", id, sanitized);
    
    bucket.put_object(&key, &bytes).await
        .map_err(|_| AppError::Internal)?;

    let path = format!("s3://{}/{}", bucket_name, key);

    // Update document reference in database
    let doc = sqlx::query_as!(
        DocumentReference,
        r#"
        UPDATE document_references
        SET attachment_path = $1,
            attachment_mime_type = $2,
            attachment_original_name = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, personnel_id, title, document_type, description, issued_date, location, self_reported_by, self_reported_at, verified_by, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        "#,
        path,
        data.mime_type,
        data.filename,
        id
    )
    .fetch_one(db.inner())
    .await?;

    Ok(Json(ApiResponse::success(doc)))
}

/// Delete document reference
#[delete("/<id>")]
pub async fn delete_document_reference(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<ApiResponse<String>>, AppError> {
    sqlx::query!("DELETE FROM document_references WHERE id = $1", id)
        .execute(db.inner())
        .await?;

    Ok(Json(ApiResponse::success("Deleted".to_string())))
}

