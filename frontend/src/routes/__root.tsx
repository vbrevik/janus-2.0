import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthProvider } from '@/contexts/auth-context'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AuthProvider>
  ),
})

