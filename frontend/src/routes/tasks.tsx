import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNDAList, useSignNDA } from '@/hooks/use-nda'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch } from '@/lib/api'
import { CheckCircle2, FileText, Clock } from 'lucide-react'

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
})

interface ProfileResponse {
  id: number;
  username: string;
  role: string;
  email?: string;
}

function TasksPage() {
  const { user } = useAuth()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  
  // Fetch user profile to get email
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiFetch<ProfileResponse>('/auth/profile')
        // Try to use email if available, otherwise use username@domain as fallback
        if (profile.email) {
          setUserEmail(profile.email)
        } else {
          // For MVP, we'll use username to match - in production, link users to personnel properly
          setUserEmail(null)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    if (user) {
      fetchProfile()
    }
  }, [user])
  
  // Query NDAs by email if available, otherwise don't query
  const { data: ndas, isLoading, refetch } = useNDAList(
    userEmail ? { email: userEmail } : undefined
  )
  const signMutation = useSignNDA()
  const [signingId, setSigningId] = useState<number | null>(null)

  // Filter for pending/active NDAs that need signing
  const pendingNDAs = ndas?.filter(nda => nda.status === 'PENDING' || nda.status === 'ACTIVE') || []

  const handleSign = async (ndaId: number) => {
    setSigningId(ndaId)
    try {
      // For now, use a simple signature - in production, this would be a real signature
      const signature = `Signed by ${user?.username} at ${new Date().toISOString()}`
      await signMutation.mutateAsync({ id: ndaId, data: { signature } })
      refetch()
    } catch (error) {
      console.error('Error signing NDA:', error)
      alert('Failed to sign NDA')
    } finally {
      setSigningId(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'SIGNED':
        return <Badge className="bg-green-100 text-green-800">Signed</Badge>
      case 'EXPIRED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Expired</Badge>
      case 'REVOKED':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Revoked</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground">Review and complete your pending tasks</p>
          </div>

          {!userEmail ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg font-semibold">Profile Not Linked</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your user account is not linked to a personnel record. Please contact an administrator.
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingNDAs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-semibold">All tasks complete!</p>
                <p className="text-sm text-muted-foreground mt-2">You have no pending tasks at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingNDAs.map((nda) => (
                <Card key={nda.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle>{nda.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Version {nda.version} • Issued: {formatDate(nda.issued_at)}
                            {nda.expires_at && ` • Expires: ${formatDate(nda.expires_at)}`}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(nda.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-mono">{nda.content}</pre>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>This agreement requires your signature</span>
                        </div>
                        <Button
                          onClick={() => handleSign(nda.id)}
                          disabled={signingId === nda.id || signMutation.isPending}
                        >
                          {signingId === nda.id ? 'Signing...' : 'Sign NDA'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Signed NDAs Section */}
          {ndas && ndas.filter(nda => nda.status === 'SIGNED').length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Previously Signed</h2>
              {ndas
                .filter(nda => nda.status === 'SIGNED')
                .map((nda) => (
                  <Card key={nda.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-green-500" />
                          <div>
                            <CardTitle>{nda.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Signed: {formatDate(nda.signed_at)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(nda.status)}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
