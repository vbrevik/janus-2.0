import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePersonnelAccess } from '@/hooks/use-access'

interface AccessControlCardProps {
  personnelId: number
}

export function AccessControlCard({ personnelId }: AccessControlCardProps) {
  const { data: access } = usePersonnelAccess(personnelId)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'EXPIRED': return 'bg-gray-100 text-gray-800'
      case 'REVOKED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Access Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Information Systems</h3>

            {access?.computer_access && access.computer_access.length > 0 ? (
              <div className="border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-7 text-xs">System</TableHead>
                      <TableHead className="h-7 text-xs">Level</TableHead>
                      <TableHead className="h-7 text-xs">Expires</TableHead>
                      <TableHead className="h-7 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {access.computer_access.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="py-1 text-xs">{acc.system_name}</TableCell>
                        <TableCell className="py-1">
                          <Badge variant="outline" className="text-[10px]">{acc.access_level}</Badge>
                        </TableCell>
                        <TableCell className="py-1 text-xs">{formatDate(acc.expires_at)}</TableCell>
                        <TableCell className="py-1">
                          <Badge className={`text-[10px] ${getStatusColor(acc.status)}`}>{acc.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No information systems access</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Data Access</h3>
            {access?.data_access && access.data_access.length > 0 ? (
              <div className="border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-7 text-xs">Classification</TableHead>
                      <TableHead className="h-7 text-xs">Level</TableHead>
                      <TableHead className="h-7 text-xs">Expires</TableHead>
                      <TableHead className="h-7 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {access.data_access.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="py-1 text-xs">{acc.data_classification}</TableCell>
                        <TableCell className="py-1">
                          <Badge variant="outline" className="text-[10px]">{acc.access_level}</Badge>
                        </TableCell>
                        <TableCell className="py-1 text-xs">{formatDate(acc.expires_at)}</TableCell>
                        <TableCell className="py-1">
                          <Badge className={`text-[10px] ${getStatusColor(acc.status)}`}>{acc.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No data access</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Physical Access</h3>
            {access?.physical_access && access.physical_access.length > 0 ? (
              <div className="border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-7 text-xs">Zone</TableHead>
                      <TableHead className="h-7 text-xs">Level</TableHead>
                      <TableHead className="h-7 text-xs">Valid Until</TableHead>
                      <TableHead className="h-7 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {access.physical_access.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="py-1 text-xs">{acc.zone_name}</TableCell>
                        <TableCell className="py-1">
                          <Badge variant="outline" className="text-[10px]">{acc.access_level}</Badge>
                        </TableCell>
                        <TableCell className="py-1 text-xs">{formatDate(acc.valid_until)}</TableCell>
                        <TableCell className="py-1">
                          <Badge className={`text-[10px] ${getStatusColor(acc.status)}`}>{acc.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No physical access</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
