import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AuthProvider } from '@/contexts/auth-context'
import { WebSocketProvider } from '@/contexts/websocket-context'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <WebSocketProvider>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
      </WebSocketProvider>
    </AuthProvider>
  ),
})

