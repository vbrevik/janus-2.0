// Person management module
// Handles CRUD operations for person entities
// Replaces both personnel and users modules

pub mod models;
pub mod handlers;

pub use models::{Person, CreatePersonRequest, UpdatePersonRequest};

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_persons,
        handlers::get_person,
        handlers::create_person,
        handlers::update_person,
        handlers::delete_person,
    ]
}

