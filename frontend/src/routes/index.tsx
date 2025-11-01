import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth, getDefaultRoute } from '@/contexts/auth-context'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { isAuthenticated, user, isLoading } = useAuth()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />
  }

  // Redirect to default route based on user role
  const defaultRoute = getDefaultRoute(user.role)
  return <Navigate to={defaultRoute} />
}
