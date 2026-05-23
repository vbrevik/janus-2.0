import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const PersonPage = lazy(() => import('./_component'))

export const Route = createFileRoute('/admin/person/')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <PersonPage />
    </Suspense>
  ),
})

// Inline create handled by CreatePersonnelRow

// Inline editing replaces EditPersonnelDialog

// Delete handled inline in PersonnelRow

// Removed old modal form component; inline fields are used instead
