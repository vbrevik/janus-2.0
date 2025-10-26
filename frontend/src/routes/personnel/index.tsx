import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'

export const Route = createFileRoute('/personnel/')({
  component: PersonnelList,
})

function PersonnelList() {
  return (
    <ProtectedRoute>
      <Layout>
        <div>
          <h1 className="text-3xl font-bold mb-6">Personnel Management</h1>
          <p className="text-muted-foreground">
            Personnel list will be implemented here...
          </p>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

