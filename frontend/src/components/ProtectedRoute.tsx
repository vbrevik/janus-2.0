import { Navigate, useLocation } from '@tanstack/react-router'
import { useAuth, getDefaultRoute } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
  redirectTo?: string
}

/**
 * ProtectedRoute component that guards routes based on user roles
 * 
 * @example
 * ```tsx
 * <ProtectedRoute allowedRoles={['admin']}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.pathname } as any} />
  }

  // Redirect if user doesn't have required role
  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to default route for user's role (or specified redirect)
    const defaultRoute = redirectTo || (user ? getDefaultRoute(user.role) : '/login')
    return <Navigate to={defaultRoute} />
  }

  // User is authenticated and has required role
  return <>{children}</>
}

