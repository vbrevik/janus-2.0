import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePersonnelList } from '@/hooks/use-personnel'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/official/personnel')({
  component: PersonnelPage,
})

function PersonnelPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [page] = useState(1)
  const { data, isLoading } = usePersonnelList(page, 20)

  const clearances: Record<string, string> = {
    UNCLASSIFIED: 'bg-blue-100 text-blue-800',
    CONFIDENTIAL: 'bg-green-100 text-green-800',
    SECRET: 'bg-yellow-100 text-yellow-800',
    TOP_SECRET: 'bg-red-100 text-red-800',
  }

  return (
    <ProtectedRoute allowedRoles={['official']}>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Personnel Lookup</h1>
            <p className="text-muted-foreground">Search and verify personnel information</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search Personnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search">Search by name or email</Label>
                  <Input
                    id="search"
                    placeholder="Enter name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Results {data && `(${data.total} found)`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Filter by search term if provided
                  const filtered = data?.items.filter(person => {
                    if (!searchTerm) return true
                    const search = searchTerm.toLowerCase()
                    return (
                      person.first_name.toLowerCase().includes(search) ||
                      person.last_name.toLowerCase().includes(search) ||
                      person.email.toLowerCase().includes(search)
                    )
                  }) || []
                  
                  return filtered.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Clearance Level</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell className="font-medium">
                            {person.first_name} {person.last_name}
                          </TableCell>
                          <TableCell>{person.email}</TableCell>
                          <TableCell>{person.department}</TableCell>
                          <TableCell>{person.position}</TableCell>
                          <TableCell>
                            <Badge className={clearances[person.clearance_level] || ''}>
                              {person.clearance_level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {person.deleted_at ? 'Inactive' : 'Active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No personnel found. Try a different search term.</p>
                  </div>
                )
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

