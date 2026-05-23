import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const DashboardPage = lazy(() => import('./dashboard/_component'))

export const Route = createFileRoute('/admin/dashboard')({
  component: () => (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      }
    >
      <DashboardPage />
    </Suspense>
  ),
})
