// Digital-resource domain (Phase 11): networks / platforms / applications,
// time-versioned policies, person↔resource grants, and the pure gate-chain
// resolver ported from the TS source of truth.

pub mod handlers;
pub mod models;
pub mod resolver;

pub fn routes() -> Vec<rocket::Route> {
    routes![
        handlers::get_world,
        handlers::issue_grant,
        handlers::issue_delegate,
    ]
}
