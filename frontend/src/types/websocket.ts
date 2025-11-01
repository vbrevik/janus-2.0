// WebSocket message types
export type WebSocketMessage =
  | NewMessageWebSocket
  | NewDiscussionWebSocket
  | MarkReadWebSocket
  | PingWebSocket
  | PongWebSocket
  | AuthWebSocket
  | ErrorWebSocket

export interface NewMessageWebSocket {
  type: 'message'
  discussion_id: number
  message: string
  created_by: number
  created_at: string
}

export interface NewDiscussionWebSocket {
  type: 'discussion'
  discussion_id: number
  subject: string
  person_id: number
  created_by: number
  created_at: string
}

export interface MarkReadWebSocket {
  type: 'read'
  discussion_id: number
  user_id: number
}

export interface PingWebSocket {
  type: 'ping'
}

export interface PongWebSocket {
  type: 'pong'
}

export interface AuthWebSocket {
  type: 'auth'
  status?: 'success' | 'failure'
  message?: string
}

export interface ErrorWebSocket {
  type: 'error'
  message: string
}

