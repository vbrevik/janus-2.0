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
import { useVendorList } from '@/hooks/use-vendors'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/official/vendors')({
  component: VendorsPage,
})

function VendorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [page] = useState(1)
  const { data, isLoading } = useVendorList(page, 20)

  const clearances: Record<string, string> = {
    UNCLASSIFIED: 'bg-blue-100 text-blue-800',
    CONFIDENTIAL: 'bg-green-100 text-green-800',
    SECRET: 'bg-yellow-100 text-yellow-800',
    TOP_SECRET: 'bg-red-100 text-red-800',
  }

  // Filter vendors by search term
  const filteredVendors = data?.items.filter(vendor => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      vendor.company_name.toLowerCase().includes(search) ||
      vendor.contact_name.toLowerCase().includes(search) ||
      vendor.contact_email.toLowerCase().includes(search) ||
      vendor.contract_number.toLowerCase().includes(search)
    )
  }) || []

  return (
    <ProtectedRoute allowedRoles={['official']}>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Vendor Lookup</h1>
            <p className="text-muted-foreground">Search and verify vendor information</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search">Search by company, contact, or contract number</Label>
                  <Input
                    id="search"
                    placeholder="Enter search term..."
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
                  Results ({filteredVendors.length} found)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredVendors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Contact Email</TableHead>
                        <TableHead>Contract Number</TableHead>
                        <TableHead>Clearance Level</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">
                            {vendor.company_name}
                          </TableCell>
                          <TableCell>{vendor.contact_name}</TableCell>
                          <TableCell>{vendor.contact_email}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {vendor.contract_number}
                          </TableCell>
                          <TableCell>
                            <Badge className={clearances[vendor.clearance_level] || ''}>
                              {vendor.clearance_level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Active
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No vendors found. Try a different search term.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}



