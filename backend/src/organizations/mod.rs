// Organization management module
// Handles CRUD operations for organization records

pub mod handlers;
pub mod models;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_organizations,
        handlers::get_organization,
        handlers::create_organization,
        handlers::update_organization,
        handlers::delete_organization,
    ]
}
