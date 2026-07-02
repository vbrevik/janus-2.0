// Person management module
// Handles CRUD operations for person entities
// Replaces both personnel and users modules

pub mod handlers;
pub mod models;

pub use models::{CreatePersonRequest, Person, UpdatePersonRequest};

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_persons,
        handlers::get_person,
        handlers::create_person,
        handlers::update_person,
        handlers::delete_person,
    ]
}
