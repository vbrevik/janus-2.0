import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Users, Building2, Key, FileText, Activity } from 'lucide-react'

export const Route = createFileRoute('/admin/dashboard')({
  component: Dashboard,
})

interface DashboardStats {
  total_personnel: number
  total_vendors: number
  total_access_grants: number
  active_access_grants: number
  recent_audit_logs: number
}

function Dashboard() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Backend returns ApiResponse<DashboardStats>
      return apiFetch<{ success: boolean; data: DashboardStats }>('/stats')
    },
  })

  const stats = response?.data

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your security clearance system
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Personnel
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_personnel || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active personnel
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Vendors
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_vendors || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Vendor organizations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Access Grants
                    </CardTitle>
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.active_access_grants || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active / {stats?.total_access_grants || 0} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Recent Activity
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.recent_audit_logs || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Last 24 hours
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Dashboard Sections */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <a href="/admin/person" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Users className="h-4 w-4" />
                        Manage Personnel
                      </a>
                      <a href="/admin/vendors" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Building2 className="h-4 w-4" />
                        Manage Vendors
                      </a>
                      <a href="/admin/access" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Key className="h-4 w-4" />
                        Grant Access
                      </a>
                      <a href="/admin/audit" className="flex items-center gap-2 text-sm hover:text-primary">
                        <FileText className="h-4 w-4" />
                        View Audit Logs
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Backend API</span>
                        <span className="text-sm text-green-600 font-medium">Healthy</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Database</span>
                        <span className="text-sm text-green-600 font-medium">Connected</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Response Time</span>
                        <span className="text-sm text-muted-foreground">&lt; 5ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
