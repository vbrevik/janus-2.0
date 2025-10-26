import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Janus 2.0
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Security Clearance Management System
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Frontend: <span className="font-mono">http://localhost:15510</span>
          </p>
          <p className="text-sm text-gray-500">
            Backend API: <span className="font-mono">http://localhost:15520</span>
          </p>
        </div>
      </div>
    </div>
  ),
})
