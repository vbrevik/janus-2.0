pub mod handlers;
pub mod models;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_document_references,
        handlers::get_document_reference,
        handlers::create_document_reference,
        handlers::update_document_reference,
        handlers::delete_document_reference,
        handlers::upload_document_attachment,
    ]
}
