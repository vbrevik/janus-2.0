use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::State;
use rocket::{delete, get, post, put};
use sqlx::PgPool;

use crate::auth::middleware::AuthGuard;
use crate::document_references::models::*;
use base64::Engine as _;
use s3::creds::Credentials;
use s3::{Bucket, Region};
use validator::Validate;

/// List document references for a personnel
#[get("/?<person_id>&<document_type>&<status>")]
pub async fn list_document_references(
    db: &State<PgPool>,
    person_id: Option<i32>, // Changed from personnel_id
    document_type: Option<String>,
    status: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<Vec<DocumentReference>>, Status> {
    // Query shape reference (intentionally unused): kept for documentation of selected columns
    let _ = "SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE 1=1";

    // Use runtime queries since person table doesn't exist at compile time yet
    let documents = if let Some(pid) = person_id {
        let doc_type_str = document_type.as_ref().map(|s| s.as_str());
        let status_str = status.as_ref().map(|s| s.as_str());

        if let (Some(t), Some(s)) = (doc_type_str, status_str) {
            sqlx::query_as::<sqlx::Postgres, DocumentReference>(
                "SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE person_id = $1 AND document_type = $2 AND status = $3 ORDER BY issued_date DESC NULLS LAST, created_at DESC"
            )
            .bind(pid)
            .bind(t)
            .bind(s)
            .fetch_all(db.inner())
            .await
        } else if let Some(t) = doc_type_str {
            sqlx::query_as::<sqlx::Postgres, DocumentReference>(
                "SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE person_id = $1 AND document_type = $2 ORDER BY issued_date DESC NULLS LAST, created_at DESC"
            )
            .bind(pid)
            .bind(t)
            .fetch_all(db.inner())
            .await
        } else if let Some(s) = status_str {
            sqlx::query_as::<sqlx::Postgres, DocumentReference>(
                "SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE person_id = $1 AND status = $2 ORDER BY issued_date DESC NULLS LAST, created_at DESC"
            )
            .bind(pid)
            .bind(s)
            .fetch_all(db.inner())
            .await
        } else {
            sqlx::query_as::<sqlx::Postgres, DocumentReference>(
                "SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references WHERE person_id = $1 ORDER BY issued_date DESC NULLS LAST, created_at DESC"
            )
            .bind(pid)
            .fetch_all(db.inner())
            .await
        }
    } else {
        sqlx::query_as::<sqlx::Postgres, DocumentReference>(
            "SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at FROM document_references ORDER BY issued_date DESC NULLS LAST, created_at DESC"
        )
        .fetch_all(db.inner())
        .await
    };

    let documents = documents.map_err(|e| {
        eprintln!("Database error in list_document_references: {:?}", e);
        Status::InternalServerError
    })?;
    Ok(Json(documents))
}

/// Get a specific document reference
#[get("/<id>")]
pub async fn get_document_reference(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<DocumentReference>, Status> {
    let doc = sqlx::query_as::<sqlx::Postgres, DocumentReference>(
        r#"
        SELECT id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        FROM document_references
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(doc))
}

/// Create a new document reference (self-report)
#[post("/", data = "<data>")]
pub async fn create_document_reference(
    db: &State<PgPool>,
    data: Json<CreateDocumentReferenceRequest>,
    auth: AuthGuard,
) -> Result<Json<DocumentReference>, Status> {
    let person_id = auth.claims.sub.parse::<i32>().unwrap_or(0);
    // The authenticated user's person_id is already in auth.claims.sub
    // No need to look up - the person_id is the authenticated person
    let document_type = data
        .document_type
        .clone()
        .unwrap_or_else(|| "security_brief".to_string());

    let issued_date = match &data.issued_date {
        Some(d) => chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok(),
        None => None,
    };

    let doc = sqlx::query_as::<sqlx::Postgres, DocumentReference>(
        r#"
        INSERT INTO document_references (person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        "#
    )
    .bind(person_id)
    .bind(&data.title)
    .bind(&document_type)
    .bind(data.description.as_deref())
    .bind(issued_date)
    .bind(data.location.as_deref())
    .bind(person_id) // self_reported_by_person_id is the same as person_id
    .bind(data.notes.as_deref())
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(doc))
}

/// Update document reference (end-user can update their own, admin can verify)
#[put("/<id>", data = "<data>")]
pub async fn update_document_reference(
    db: &State<PgPool>,
    id: i32,
    data: Json<UpdateDocumentReferenceRequest>,
    _auth: AuthGuard,
) -> Result<Json<DocumentReference>, Status> {
    let issued_date_opt = data
        .issued_date
        .as_ref()
        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

    let doc = sqlx::query_as::<sqlx::Postgres, DocumentReference>(
        r#"
        UPDATE document_references
        SET title = COALESCE($1, title),
            document_type = COALESCE($2, document_type),
            description = COALESCE($3, description),
            issued_date = COALESCE($4, issued_date),
            location = COALESCE($5, location),
            status = COALESCE($6, status),
            notes = COALESCE($7, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        "#
    )
    .bind(data.title.as_deref())
    .bind(data.document_type.as_deref())
    .bind(data.description.as_deref())
    .bind(issued_date_opt)
    .bind(data.location.as_deref())
    .bind(data.status.as_deref())
    .bind(data.notes.as_deref())
    .bind(id)
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(doc))
}
/// Upload an attachment for a document reference (PDF/image as base64)
#[post("/<id>/attachment", data = "<data>")]
pub async fn upload_document_attachment(
    db: &State<PgPool>,
    id: i32,
    data: Json<AttachmentUploadRequest>,
    _auth: AuthGuard,
) -> Result<Json<DocumentReference>, Status> {
    data.0.validate().map_err(|_| Status::BadRequest)?;

    // Decode base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data.data_base64)
        .map_err(|_| Status::BadRequest)?;

    // MinIO configuration from environment
    let endpoint =
        std::env::var("MINIO_ENDPOINT").unwrap_or_else(|_| "http://localhost:9000".to_string());
    let access_key = std::env::var("MINIO_ACCESS_KEY").unwrap_or_else(|_| "janusminio".to_string());
    let secret_key =
        std::env::var("MINIO_SECRET_KEY").unwrap_or_else(|_| "janusminio_password".to_string());
    let bucket_name =
        std::env::var("MINIO_BUCKET").unwrap_or_else(|_| "janus-documents".to_string());
    let region = std::env::var("MINIO_REGION").unwrap_or_else(|_| "us-east-1".to_string());

    // Create credentials and bucket
    let credentials = Credentials::new(Some(&access_key), Some(&secret_key), None, None, None)
        .map_err(|e| {
            eprintln!("Database error: {:?}", e);
            Status::InternalServerError
        })?;

    let region = Region::Custom {
        region: region.clone(),
        endpoint: endpoint.clone(),
    };
    let bucket = Bucket::new(&bucket_name, region, credentials)
        .map_err(|e| {
            eprintln!("Database error: {:?}", e);
            Status::InternalServerError
        })?
        .with_path_style();

    // Upload file to MinIO
    let sanitized = data.filename.replace('/', "_");
    let key = format!("document_references/{}/{}", id, sanitized);

    bucket.put_object(&key, &bytes).await.map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    let path = format!("s3://{}/{}", bucket_name, key);

    // Update document reference in database
    let doc = sqlx::query_as::<sqlx::Postgres, DocumentReference>(
        r#"
        UPDATE document_references
        SET attachment_path = $1,
            attachment_mime_type = $2,
            attachment_original_name = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, person_id, title, document_type, description, issued_date, location, self_reported_by_person_id, self_reported_at, verified_by_person_id, verified_at, status, notes, attachment_path, attachment_mime_type, attachment_original_name, created_at, updated_at
        "#
    )
    .bind(&path)
    .bind(&data.mime_type)
    .bind(&data.filename)
    .bind(id)
    .fetch_one(db.inner())
    .await
    .map_err(|e| {
        eprintln!("Database error: {:?}", e);
        Status::InternalServerError
    })?;

    Ok(Json(doc))
}

/// Delete document reference
#[delete("/<id>")]
pub async fn delete_document_reference(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<&'static str>, Status> {
    sqlx::query("DELETE FROM document_references WHERE id = $1")
        .bind(id)
        .execute(db.inner())
        .await
        .map_err(|e| {
            eprintln!("Database error: {:?}", e);
            Status::InternalServerError
        })?;

    Ok(Json("Deleted"))
}
