pub mod models;
pub mod handlers;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_ndas,
        handlers::get_nda,
        handlers::create_nda,
        handlers::sign_nda,
        handlers::reject_nda,
        handlers::update_nda_status,
        handlers::delete_nda,
    ]
}

