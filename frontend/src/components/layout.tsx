import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth, getDefaultRoute } from '@/contexts/auth-context'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Users, Building2, Key, FileText, LogOut, User, ChevronDown, LayoutDashboard, Server, Lock, Wifi, WifiOff, ClipboardList } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isConnected: wsConnected } = useWebSocketContext()

  // Define navigation items by role
  const adminNavItems: NavItem[] = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/admin/personnel', label: 'Personnel', icon: <Users className="h-4 w-4" /> },
    { to: '/admin/vendors', label: 'Vendors', icon: <Building2 className="h-4 w-4" /> },
    { to: '/admin/info-systems', label: 'Info Systems', icon: <Server className="h-4 w-4" /> },
    { to: '/admin/access', label: 'Access Control', icon: <Key className="h-4 w-4" /> },
    { to: '/admin/ndas', label: 'NDAs', icon: <FileText className="h-4 w-4" /> },
    { to: '/admin/audit', label: 'Audit Logs', icon: <FileText className="h-4 w-4" /> },
    { to: '/admin/roles', label: 'Roles', icon: <Lock className="h-4 w-4" /> },
  ]

  const enduserNavItems: NavItem[] = [
    { to: '/enduser/tasks', label: 'My Tasks', icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/enduser/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  ]

  const officialNavItems: NavItem[] = [
    { to: '/official/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/official/personnel', label: 'Personnel Lookup', icon: <Users className="h-4 w-4" /> },
    { to: '/official/vendors', label: 'Vendor Lookup', icon: <Building2 className="h-4 w-4" /> },
  ]

  // Get navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (!user) return []
    switch (user.role) {
      case 'admin':
        return adminNavItems
      case 'enduser':
        return enduserNavItems
      case 'official':
        return officialNavItems
      default:
        return []
    }
  }

  const navItems = getNavItems()
  const getHeaderSubtitle = (): string => {
    if (!user) return 'Security Clearance Management'
    switch (user.role) {
      case 'admin':
        return 'Security Clearance Management'
      case 'enduser':
        return 'End User Portal'
      case 'official':
        return 'Official Entities Portal'
      default:
        return 'Security Clearance Management'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to={user ? getDefaultRoute(user.role) : '/login'} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Janus 2.0</h1>
                <p className="text-xs text-muted-foreground">
                  {getHeaderSubtitle()}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  {/* WebSocket Connection Status */}
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Connection</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${
                          wsConnected 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}
                      >
                        {wsConnected ? (
                          <>
                            <Wifi className="h-3 w-3 mr-1" />
                            Live
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { 
                    e.preventDefault()
                    const profileRoute = user?.role === 'admin' ? '/admin/profile' 
                      : user?.role === 'enduser' ? '/enduser/profile' 
                      : '/official/profile'
                    navigate({ to: profileRoute as any })
                  }}>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { 
                    e.preventDefault()
                    const profileRoute = user?.role === 'admin' ? '/admin/profile' 
                      : user?.role === 'enduser' ? '/enduser/profile' 
                      : '/official/profile'
                    navigate({ to: profileRoute as any, search: { change: '1' } as any })
                  }}>
                    <Shield className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation - Only show if user is authenticated */}
      {user && navItems.length > 0 && (
        <nav className="border-b bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} icon={item.icon}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      )}

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

