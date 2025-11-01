import { useEffect, useRef, useState, useCallback } from 'react'
import type { WebSocketMessage } from '@/types/websocket'

interface UseWebSocketOptions {
  url: string
  token: string | null
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  reconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(reconnect)

  const connect = useCallback(() => {
    if (!token) {
      setConnectionError('No authentication token available')
      return
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        
        // Send authentication message as first message
        ws.send(JSON.stringify({
          type: 'auth',
          token: token,
        }))
        
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          
          // Handle auth response
          if (message.type === 'auth') {
            if ('status' in message && message.status === 'success') {
              console.log('WebSocket authenticated successfully')
            } else {
              setConnectionError('Authentication failed')
              ws.close()
            }
            return
          }
          
          // Handle error messages
          if (message.type === 'error') {
            setConnectionError('message' in message ? message.message : 'WebSocket error')
            return
          }
          
          // Handle ping/pong
          if (message.type === 'pong') {
            // Respond to ping if needed
            return
          }
          
          // Forward other messages to handler
          onMessage?.(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('WebSocket connection error')
        onError?.(error)
      }

      ws.onclose = () => {
        setIsConnected(false)
        onDisconnect?.()
        
        // Attempt reconnection if enabled
        if (shouldReconnectRef.current && token) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setConnectionError('Failed to create WebSocket connection')
    }
  }, [url, token, onMessage, onError, onConnect, onDisconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  // Connect on mount or when URL/token changes
  useEffect(() => {
    if (token) {
      shouldReconnectRef.current = reconnect
      connect()
    }

    return () => {
      disconnect()
    }
  }, [url, token, connect, disconnect])

  // Send ping periodically to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' })
    }, 30000) // Every 30 seconds

    return () => clearInterval(pingInterval)
  }, [isConnected, sendMessage])

  return {
    isConnected,
    connectionError,
    sendMessage,
    disconnect,
    reconnect: connect,
  }
}

