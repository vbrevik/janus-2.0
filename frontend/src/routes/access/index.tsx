import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'

export const Route = createFileRoute('/access/')({
  component: AccessControl,
})

function AccessControl() {
  return (
    <ProtectedRoute>
      <Layout>
        <div>
          <h1 className="text-3xl font-bold mb-6">Access Control</h1>
          <p className="text-muted-foreground">
            Access control will be implemented in MVP 2...
          </p>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

