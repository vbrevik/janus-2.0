use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum WebSocketMessage {
    #[serde(rename = "message")]
    NewMessage {
        discussion_id: i32,
        message: String,
        created_by: i32,
        created_at: String,
    },
    #[serde(rename = "discussion")]
    NewDiscussion {
        discussion_id: i32,
        subject: String,
        person_id: i32,
        created_by: i32,
        created_at: String,
    },
    #[serde(rename = "read")]
    MarkRead { discussion_id: i32, user_id: i32 },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,
    #[serde(rename = "error")]
    Error { message: String },
}

impl WebSocketMessage {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            r#"{"type":"error","message":"Failed to serialize message"}"#.to_string()
        })
    }

    pub fn from_json(data: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(data)
    }
}
