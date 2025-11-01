use rocket::serde::json::Json;
use rocket::State;
use rocket::http::Status;
use sqlx::PgPool;
use chrono::Utc;

use crate::nda::models::*;
use crate::audit::handlers::create_audit_log;
use crate::audit::models::CreateAuditLogRequest;
use crate::auth::middleware::AuthGuard;

/// List NDAs for personnel or by user email
#[get("/?<personnel_id>&<status>&<email>")]
pub async fn list_ndas(
    db: &State<PgPool>,
    personnel_id: Option<i32>,
    status: Option<String>,
    email: Option<String>,
    _auth: AuthGuard,
) -> Result<Json<Vec<NDA>>, Status> {
    let query_result = if let Some(e) = email {
        // Join with personnel table to filter by email
        if let Some(s) = status {
            sqlx::query_as::<sqlx::Postgres, NDA>(
                r#"
                SELECT n.id, n.personnel_id, n.title, n.content, n.version, n.status, n.issued_by, n.issued_at, n.signed_at, n.expires_at, n.signature, n.rejection_reason, n.sent_by_vendor_id, n.sent_at, n.created_at, n.updated_at
                FROM nda n
                JOIN personnel p ON n.personnel_id = p.id
                WHERE p.email = $1 AND n.status = $2
                ORDER BY n.created_at DESC
                "#
            )
            .bind(&e)
            .bind(&s)
            .fetch_all(db.inner())
            .await
        } else {
            sqlx::query_as::<sqlx::Postgres, NDA>(
                r#"
                SELECT n.id, n.personnel_id, n.title, n.content, n.version, n.status, n.issued_by, n.issued_at, n.signed_at, n.expires_at, n.signature, n.rejection_reason, n.sent_by_vendor_id, n.sent_at, n.created_at, n.updated_at
                FROM nda n
                JOIN personnel p ON n.personnel_id = p.id
                WHERE p.email = $1
                ORDER BY n.created_at DESC
                "#
            )
            .bind(&e)
            .fetch_all(db.inner())
            .await
        }
    } else if let Some(pid) = personnel_id {
        if let Some(s) = status {
            sqlx::query_as::<sqlx::Postgres, NDA>(
                "SELECT id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at FROM nda WHERE personnel_id = $1 AND status = $2 ORDER BY created_at DESC"
            )
            .bind(pid)
            .bind(&s)
            .fetch_all(db.inner())
            .await
        } else {
            sqlx::query_as::<sqlx::Postgres, NDA>(
                "SELECT id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at FROM nda WHERE personnel_id = $1 ORDER BY created_at DESC"
            )
            .bind(pid)
            .fetch_all(db.inner())
            .await
        }
    } else if let Some(s) = status {
        sqlx::query_as::<sqlx::Postgres, NDA>(
            "SELECT id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at FROM nda WHERE status = $1 ORDER BY created_at DESC"
        )
        .bind(&s)
        .fetch_all(db.inner())
        .await
    } else {
        sqlx::query_as::<sqlx::Postgres, NDA>(
            "SELECT id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at FROM nda ORDER BY created_at DESC"
        )
        .fetch_all(db.inner())
        .await
    };

    let ndas = query_result.map_err(|_| Status::InternalServerError)?;
    Ok(Json(ndas))
}

/// Get a specific NDA
#[get("/<id>")]
pub async fn get_nda(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<NDA>, Status> {
    let nda = sqlx::query_as!(
        NDA,
        r#"
        SELECT id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at
        FROM nda
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(nda))
}

/// Create a new NDA
#[post("/", data = "<data>")]
pub async fn create_nda(
    db: &State<PgPool>,
    data: Json<CreateNDARequest>,
    auth: AuthGuard,
) -> Result<Json<NDA>, Status> {
    let issued_by = auth.claims.sub.parse::<i32>().unwrap_or(0);
    let version = data.version.clone().unwrap_or_else(|| "1.0".to_string());

    let expires_at = match &data.expires_at {
        Some(d) => chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .ok()
            .and_then(|date| date.and_hms_opt(23, 59, 59)),
        None => None,
    };

    let nda = sqlx::query_as!(
        NDA,
        r#"
        INSERT INTO nda (personnel_id, title, content, version, status, issued_by, expires_at, sent_by_vendor_id, sent_at)
        VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8)
        RETURNING id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at
        "#,
        data.personnel_id,
        data.title,
        data.content,
        version,
        issued_by,
        expires_at,
        data.sent_by_vendor_id,
        Some(Utc::now().naive_utc())
    )
    .fetch_one(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?;

    // Audit: NDA_SENT
    let _ = create_audit_log(&CreateAuditLogRequest {
        user_id: Some(issued_by as i32),
        username: "system".to_string(),
        action: "NDA_SENT".to_string(),
        resource_type: "nda".to_string(),
        resource_id: Some(nda.id),
        details: Some(format!("NDA '{}' sent to personnel_id={}", nda.title, nda.personnel_id)),
        ip_address: None,
        user_agent: None,
    }, db.inner()).await;

    Ok(Json(nda))
}

/// Sign an NDA
#[post("/<id>/sign", data = "<data>")]
pub async fn sign_nda(
    db: &State<PgPool>,
    id: i32,
    data: Json<SignNDARequest>,
    auth: AuthGuard,
) -> Result<Json<NDA>, Status> {
    let now = Utc::now().naive_utc();

    let nda = sqlx::query_as!(
        NDA,
        r#"
        UPDATE nda
        SET status = 'SIGNED',
            signed_at = $1,
            signature = $2,
            updated_at = $1
        WHERE id = $3 AND status IN ('PENDING', 'ACTIVE')
        RETURNING id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at
        "#,
        now,
        data.signature,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    // Audit: NDA_SIGNED
    let _ = create_audit_log(&CreateAuditLogRequest {
        user_id: auth.claims.sub.parse::<i32>().ok(),
        username: auth.claims.sub.clone(),
        action: "NDA_SIGNED".to_string(),
        resource_type: "nda".to_string(),
        resource_id: Some(nda.id),
        details: Some("NDA signed by end user".to_string()),
        ip_address: None,
        user_agent: None,
    }, db.inner()).await;

    Ok(Json(nda))
}

/// Reject an NDA (end-user)
#[post("/<id>/reject", data = "<data>")]
pub async fn reject_nda(
    db: &State<PgPool>,
    id: i32,
    data: Json<RejectNDARequest>,
    auth: AuthGuard,
) -> Result<Json<NDA>, Status> {
    let now = Utc::now().naive_utc();

    let nda = sqlx::query_as!(
        NDA,
        r#"
        UPDATE nda
        SET status = 'REVOKED',
            rejection_reason = $1,
            updated_at = $2
        WHERE id = $3 AND status IN ('PENDING', 'ACTIVE')
        RETURNING id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at
        "#,
        data.reason,
        now,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    // Audit: NDA_REJECTED
    let _ = create_audit_log(&CreateAuditLogRequest {
        user_id: auth.claims.sub.parse::<i32>().ok(),
        username: auth.claims.sub.clone(),
        action: "NDA_REJECTED".to_string(),
        resource_type: "nda".to_string(),
        resource_id: Some(nda.id),
        details: Some(format!("Reason: {}", data.reason)),
        ip_address: None,
        user_agent: None,
    }, db.inner()).await;

    Ok(Json(nda))
}

/// Update NDA status (admin only)
#[put("/<id>/status", data = "<data>")]
pub async fn update_nda_status(
    db: &State<PgPool>,
    id: i32,
    data: Json<UpdateNDARequest>,
    _auth: AuthGuard,
) -> Result<Json<NDA>, Status> {
    let nda = sqlx::query_as!(
        NDA,
        r#"
        UPDATE nda
        SET status = COALESCE($1, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, personnel_id, title, content, version, status, issued_by, issued_at, signed_at, expires_at, signature, rejection_reason, sent_by_vendor_id, sent_at, created_at, updated_at
        "#,
        data.status,
        id
    )
    .fetch_optional(db.inner())
    .await
    .map_err(|_| Status::InternalServerError)?
    .ok_or(Status::NotFound)?;

    Ok(Json(nda))
}

/// Delete/Revoke NDA
#[delete("/<id>")]
pub async fn delete_nda(
    db: &State<PgPool>,
    id: i32,
    _auth: AuthGuard,
) -> Result<Json<&'static str>, Status> {
    sqlx::query!("UPDATE nda SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", id)
        .execute(db.inner())
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json("Revoked"))
}
