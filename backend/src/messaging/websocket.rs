use crate::messaging::models::WebSocketMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::tungstenite::Message;

pub type ConnectionMap = Arc<RwLock<HashMap<i32, Vec<mpsc::UnboundedSender<Message>>>>>;

pub struct WebSocketManager {
    connections: ConnectionMap,
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_connection(&self, user_id: i32, tx: mpsc::UnboundedSender<Message>) {
        let mut connections = self.connections.write().await;
        connections.entry(user_id).or_insert_with(Vec::new).push(tx);
    }

    pub async fn remove_connection(&self, user_id: i32, tx_id: usize) {
        let mut connections = self.connections.write().await;
        if let Some(senders) = connections.get_mut(&user_id) {
            if senders.len() > tx_id {
                senders.remove(tx_id);
            }
            if senders.is_empty() {
                connections.remove(&user_id);
            }
        }
    }

    pub async fn broadcast_to_user(&self, user_id: i32, message: WebSocketMessage) {
        let connections = self.connections.read().await;
        if let Some(senders) = connections.get(&user_id) {
            let json = message.to_json();
            for sender in senders {
                let _ = sender.send(Message::Text(json.clone()));
            }
        }
    }

    pub async fn broadcast_to_all(&self, message: WebSocketMessage) {
        let connections = self.connections.read().await;
        let json = message.to_json();
        for senders in connections.values() {
            for sender in senders {
                let _ = sender.send(Message::Text(json.clone()));
            }
        }
    }

    pub async fn broadcast_to_users(&self, user_ids: &[i32], message: WebSocketMessage) {
        let connections = self.connections.read().await;
        let json = message.to_json();
        for user_id in user_ids {
            if let Some(senders) = connections.get(user_id) {
                for sender in senders {
                    let _ = sender.send(Message::Text(json.clone()));
                }
            }
        }
    }

    pub fn get_connection_map(&self) -> ConnectionMap {
        Arc::clone(&self.connections)
    }
}

// Expose connections for handlers.rs to check connection index
impl WebSocketManager {
    pub fn connections(&self) -> ConnectionMap {
        Arc::clone(&self.connections)
    }
}

impl Clone for WebSocketManager {
    fn clone(&self) -> Self {
        Self {
            connections: Arc::clone(&self.connections),
        }
    }
}

impl Default for WebSocketManager {
    fn default() -> Self {
        Self::new()
    }
}
