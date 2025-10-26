import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/personnel" />
  }

  return <Navigate to="/login" />
}
