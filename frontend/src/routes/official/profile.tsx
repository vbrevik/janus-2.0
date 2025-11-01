import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { User, Shield, Calendar, Settings } from 'lucide-react'

export const Route = createFileRoute('/official/profile')({
  component: Profile,
})

interface ProfileData {
  id: number
  username: string
  role: string
  created_at: string
  updated_at: string
}

interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

function Profile() {
  useAuth()
  useNavigate()
  useQueryClient()
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      return apiFetch<ProfileData>('/auth/profile')
    },
  })

  // Auto-open change password when /profile?change=1
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const shouldOpen = params.get('change') === '1'
    if (shouldOpen && !showPasswordDialog) {
      setShowPasswordDialog(true)
    }
  }

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      return apiFetch<void>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      setShowPasswordDialog(false)
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    },
  })

  const handlePasswordChange = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('New passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    changePasswordMutation.mutate({
      old_password: passwordForm.old_password,
      new_password: passwordForm.new_password,
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-500'
      case 'manager':
        return 'bg-blue-500'
      case 'operator':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <ProtectedRoute allowedRoles={['enduser']}>
      <Layout>
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ) : profile ? (
            <>
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Your account details and assigned role
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Username</Label>
                      <p className="text-lg font-semibold">{profile.username}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Assigned Role</Label>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-white text-sm font-medium ${getRoleBadgeColor(profile.role)}`}>
                          {profile.role.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Account Created
                      </Label>
                      <p className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Last Updated
                      </Label>
                      <p className="text-sm">{new Date(profile.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button onClick={() => setShowPasswordDialog(!showPasswordDialog)}>
                      Change Password
                    </Button>

                    {showPasswordDialog && (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <Label htmlFor="old_password">Current Password</Label>
                          <Input
                            id="old_password"
                            type="password"
                            value={passwordForm.old_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                            placeholder="Enter current password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new_password">New Password</Label>
                          <Input
                            id="new_password"
                            type="password"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                            placeholder="Enter new password (min 8 characters)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm_password">Confirm New Password</Label>
                          <Input
                            id="confirm_password"
                            type="password"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handlePasswordChange}
                            disabled={changePasswordMutation.isPending}
                          >
                            {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowPasswordDialog(false)
                              setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
