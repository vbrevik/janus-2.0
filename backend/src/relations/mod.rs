pub mod models;
pub mod handlers;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_relations,
        handlers::list_personnel_relations,
        handlers::list_vendor_relations,
        handlers::create_relation,
        handlers::update_relation,
        handlers::delete_relation,
        handlers::get_hierarchy,
    ]
}

