pub mod models;
pub mod handlers;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_roles,
        handlers::create_role,
        handlers::update_role,
        handlers::delete_role,
        handlers::list_permissions,
        handlers::get_role_permissions,
        handlers::set_role_permissions,
    ]
}
