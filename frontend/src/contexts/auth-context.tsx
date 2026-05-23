import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface User {
  id: string
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<{ role: string }>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<{ role: string }> => {
    const response = await apiFetch<{
      token: string
      person_id: string  // Backend returns person_id, not user_id
      role: string
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })

    const userData: User = {
      id: response.person_id,  // Use person_id from response
      username,
      role: response.role,
    }

    // Store in state
    setToken(response.token)
    setUser(userData)

    // Persist to localStorage
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(userData))

    // Return role for redirect purposes
    return { role: response.role }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Get the default route for a user role after login
 */
export function getDefaultRoute(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'enduser':
      return '/enduser/tasks'
    case 'official':
      return '/official/dashboard'
    default:
      return '/login'
  }
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: string | null | undefined, requiredRole: string): boolean {
  return userRole === requiredRole
}

/**
 * Check if user has any of the allowed roles
 */
export function hasAnyRole(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

