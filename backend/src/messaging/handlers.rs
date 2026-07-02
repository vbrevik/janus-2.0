use futures_util::{SinkExt, StreamExt};
use sqlx::PgPool;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{accept_async, WebSocketStream};

use crate::auth::jwt::validate_jwt;
use crate::messaging::models::WebSocketMessage;
use crate::messaging::websocket::WebSocketManager;

/// WebSocket connection handler
pub async fn handle_websocket_connection(
    stream: WebSocketStream<tokio::net::TcpStream>,
    initial_user_id: i32,
    manager: WebSocketManager,
    jwt_secret: Option<String>,
) {
    let (mut ws_sender, mut ws_receiver) = stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Authenticate: Wait for first message with JWT token
    let mut user_id = initial_user_id;
    let mut authenticated = jwt_secret.is_none(); // If no JWT secret, skip auth

    if let Some(secret) = jwt_secret.as_ref() {
        // Wait for authentication message (first message should be: {"type":"auth","token":"..."})
        if let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(auth_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(token) = auth_msg.get("token").and_then(|t| t.as_str()) {
                            match validate_jwt(token, secret) {
                                Ok(claims) => {
                                    if let Ok(uid) = claims.sub.parse::<i32>() {
                                        user_id = uid;
                                        authenticated = true;
                                        // Send auth success
                                        let _ = ws_sender
                                            .send(Message::Text(
                                                r#"{"type":"auth","status":"success"}"#.to_string(),
                                            ))
                                            .await;
                                    }
                                }
                                Err(e) => {
                                    eprintln!("JWT validation error: {:?}", e);
                                    let _ = ws_sender
                                        .send(Message::Text(
                                            r#"{"type":"error","message":"Invalid token"}"#
                                                .to_string(),
                                        ))
                                        .await;
                                    return;
                                }
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => return,
                Err(e) => {
                    eprintln!("WebSocket error during auth: {:?}", e);
                    return;
                }
                _ => {}
            }
        } else {
            return; // Connection closed
        }

        if !authenticated {
            let _ = ws_sender
                .send(Message::Text(
                    r#"{"type":"error","message":"Authentication required"}"#.to_string(),
                ))
                .await;
            return;
        }
    }

    // Track this connection's index for removal (before registering)
    let connection_map = manager.connections();
    let connection_index = {
        let connections = connection_map.read().await;
        connections.get(&user_id).map(|v| v.len()).unwrap_or(0)
    };

    // Register this connection
    manager.add_connection(user_id, tx.clone()).await;

    // Spawn task to forward messages from manager to WebSocket
    let user_id_clone = user_id;
    let manager_clone = manager.clone();
    let tx_index = connection_index;
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
        manager_clone
            .remove_connection(user_id_clone, tx_index)
            .await;
    });

    // Handle incoming messages from client
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(ws_msg) = WebSocketMessage::from_json(&text) {
                    match ws_msg {
                        WebSocketMessage::Ping => {
                            let _ = tx.send(Message::Text(WebSocketMessage::Pong.to_json()));
                        }
                        WebSocketMessage::MarkRead {
                            discussion_id,
                            user_id: _,
                        } => {
                            // Handle mark as read - could broadcast to other users
                            eprintln!(
                                "Mark read request for discussion {} from user {}",
                                discussion_id, user_id
                            );
                        }
                        _ => {
                            // Ignore other message types for now
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                break;
            }
            Ok(Message::Ping(data)) => {
                let _ = tx.send(Message::Pong(data));
            }
            Err(e) => {
                eprintln!("WebSocket error: {:?}", e);
                break;
            }
            _ => {}
        }
    }

    // Unregister connection - use the original connection_index
    manager.remove_connection(user_id, connection_index).await;
}

/// Start WebSocket server
pub async fn start_websocket_server(
    addr: SocketAddr,
    jwt_secret: String,
    manager: WebSocketManager,
    _db_pool: PgPool,
) -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind(addr).await?;
    println!("✅ WebSocket server listening on {}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        let manager_clone = manager.clone();
        let jwt_secret_clone = jwt_secret.clone();

        tokio::spawn(async move {
            let ws_stream = match accept_async(stream).await {
                Ok(ws) => ws,
                Err(e) => {
                    eprintln!("Error accepting WebSocket connection: {}", e);
                    return;
                }
            };

            // Pass JWT secret for authentication
            // User will send auth message as first message
            handle_websocket_connection(
                ws_stream,
                0, // Temporary user_id, will be set after authentication
                manager_clone,
                Some(jwt_secret_clone),
            )
            .await;
        });
    }

    Ok(())
}
