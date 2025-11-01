import React, { createContext, useContext } from 'react'
import { useWebSocket } from '@/hooks/use-websocket'
import { useAuth } from './auth-context'
import type { WebSocketMessage } from '@/types/websocket'

interface WebSocketContextType {
  isConnected: boolean
  connectionError: string | null
  sendMessage: (message: object) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:15540'

  const { isConnected, connectionError, sendMessage } = useWebSocket({
    url: wsUrl,
    token: token,
    onMessage: (message: WebSocketMessage) => {
      // Global message handler - can be extended
      console.log('WebSocket message:', message)
    },
    reconnect: true,
  })

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        connectionError,
        sendMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

