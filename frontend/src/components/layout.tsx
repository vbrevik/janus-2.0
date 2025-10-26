import { Link } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Shield, Users, Building2, Key, FileText, LogOut } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Janus 2.0</h1>
                <p className="text-xs text-muted-foreground">
                  Security Clearance Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <p className="font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <NavLink to="/personnel" icon={<Users className="h-4 w-4" />}>
              Personnel
            </NavLink>
            <NavLink to="/vendors" icon={<Building2 className="h-4 w-4" />}>
              Vendors
            </NavLink>
            <NavLink to="/access" icon={<Key className="h-4 w-4" />}>
              Access Control
            </NavLink>
            <NavLink to="/audit" icon={<FileText className="h-4 w-4" />}>
              Audit Logs
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border-b-2 border-transparent data-[status=active]:border-primary data-[status=active]:text-foreground"
      activeOptions={{ exact: false }}
    >
      {icon}
      {children}
    </Link>
  )
}

