import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'

export const Route = createFileRoute('/audit/')({
  component: AuditLogs,
})

function AuditLogs() {
  return (
    <ProtectedRoute>
      <Layout>
        <div>
          <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
          <p className="text-muted-foreground">
            Audit logs viewer will be implemented here...
          </p>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

