import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePersonList } from '@/hooks/use-person'
import { usePersonAccess } from '@/hooks/use-access'
import { Computer, Database, Key, Search } from 'lucide-react'
import type { Person } from '@/types/person'

export const Route = createFileRoute('/access/view')({
  component: AccessView,
})

function AccessView() {
  const [selectedPersonId, setSelectedPersonId] = useState<number>(0)
  const { data: personPage } = usePersonList(1, 100) // Changed from personnelPage
  const { data: accessData, isLoading } = usePersonAccess(selectedPersonId) // Changed from usePersonnelAccess

  const handleSearch = () => {
    // Access data will automatically load when selectedPersonId changes
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">View Personnel Access</h1>
          
          {/* Personnel Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Personnel to View Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="personnel-select">Personnel</Label>
                  <Select 
                    value={selectedPersonId > 0 ? String(selectedPersonId) : ''} 
                    onValueChange={(v) => setSelectedPersonId(parseInt(v))}
                  >
                    <SelectTrigger id="personnel-select">
                      <SelectValue placeholder="Choose personnel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {personPage?.items.map((p: Person) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.first_name} {p.last_name} (#{p.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={!selectedPersonId}>
                    <Search className="h-4 w-4 mr-2" />
                    View Access
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Details */}
          {selectedPersonId > 0 && (
            <>
              {isLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : accessData ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Information Systems Access */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Computer className="h-5 w-5" />
                        <CardTitle>Information Systems</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {accessData.computer_access && accessData.computer_access.length > 0 ? (
                        <div className="space-y-3">
                          {accessData.computer_access.map((access) => (
                            <div key={access.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{access.system_name}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={getStatusColor(access.status)}>
                                      {access.status}
                                    </Badge>
                                    <Badge variant="outline">
                                      {access.access_level}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Granted: {new Date(access.granted_at).toLocaleDateString()}
                                  </p>
                                  {access.expires_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Expires: {new Date(access.expires_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No information systems access</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Data Access */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        <CardTitle>Data Access</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {accessData.data_access && accessData.data_access.length > 0 ? (
                        <div className="space-y-3">
                          {accessData.data_access.map((access) => (
                            <div key={access.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{access.data_classification}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={getStatusColor(access.status)}>
                                      {access.status}
                                    </Badge>
                                    <Badge variant="outline">
                                      {access.access_level}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Granted: {new Date(access.granted_at).toLocaleDateString()}
                                  </p>
                                  {access.expires_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Expires: {new Date(access.expires_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data access</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Physical Access */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        <CardTitle>Physical Access</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {accessData.physical_access && accessData.physical_access.length > 0 ? (
                        <div className="space-y-3">
                          {accessData.physical_access.map((access) => (
                            <div key={access.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{access.zone_name}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={getStatusColor(access.status)}>
                                      {access.status}
                                    </Badge>
                                    <Badge variant="outline">
                                      {access.access_level}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Valid from: {new Date(access.valid_from).toLocaleDateString()}
                                  </p>
                                  {access.valid_until && (
                                    <p className="text-xs text-muted-foreground">
                                      Valid until: {new Date(access.valid_until).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No physical access</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">No access data found for this personnel</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function getStatusColor(status: string): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case 'ACTIVE':
      return 'default'
    case 'REVOKED':
      return 'destructive'
    case 'EXPIRED':
      return 'secondary'
    default:
      return 'outline'
  }
}
