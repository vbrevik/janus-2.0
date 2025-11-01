pub mod models;
pub mod handlers;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::list_discussions,
        handlers::get_discussion,
        handlers::create_discussion,
        handlers::create_reply,
    ]
}
