import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useVendorRelations, useCreateVendorRelation, useDeleteVendorRelation } from '@/hooks/use-vendor-relations'
import { useVendorList } from '@/hooks/use-vendors'
import { Plus, Trash2 } from 'lucide-react'
import type { RelationType } from '@/types/vendor-relation'

interface VendorRelationsTabProps {
  personnelId: number
  personnelName: string
}

export function VendorRelationsTab({ personnelId }: VendorRelationsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<number>(0)
  const [relationType, setRelationType] = useState<RelationType>('employee')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // TODO: Need backend endpoint to get relations by personnel_id
  // For now, disable the query since we need vendorId for useVendorRelations
  const { data: relations, isLoading, refetch } = useVendorRelations(0, { enabled: false })
  const { data: vendors } = useVendorList(1, 1000)
  const createRelation = useCreateVendorRelation()
  const deleteRelation = useDeleteVendorRelation()

  const getVendorName = (vendorId: number) => {
    return vendors?.items.find(v => v.id === vendorId)?.company_name || `Vendor #${vendorId}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  const getRelationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      employee: 'Employee',
      consultant: 'Consultant',
      partner: 'Partner',
      subcontractor: 'Subcontractor',
      sub_vendor: 'Sub-Vendor'
    }
    return labels[type] || type
  }

  // Filter relations based on selected filter type
  const filteredRelations = relations?.filter((rel: any) => {
    if (filterType === 'all') return true
    return rel.relation_type === filterType
  }) || []

  const handleCreateRelation = async () => {
    if (!selectedVendor) {
      alert('Please select a vendor')
      return
    }

    try {
      await createRelation.mutateAsync({
        vendor_id: selectedVendor,
        related_personnel_id: personnelId,
        relation_type: relationType,
        valid_from: validFrom || undefined,
        valid_until: validUntil || undefined,
        notes: notes || undefined,
      })

      setShowAddForm(false)
      setSelectedVendor(0)
      setRelationType('employee')
      setValidFrom('')
      setValidUntil('')
      setNotes('')
      refetch()
    } catch (error) {
      console.error('Error creating vendor relation:', error)
      alert('Failed to create vendor relation')
    }
  }

  const handleDeleteRelation = async (relationId: number) => {
    if (confirm('Are you sure you want to delete this relation?')) {
      try {
        await deleteRelation.mutateAsync(relationId)
        refetch()
      } catch (error) {
        console.error('Error deleting vendor relation:', error)
        alert('Failed to delete vendor relation')
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Vendor Relations</CardTitle>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="border rounded-lg p-3 mb-4 space-y-3 bg-muted/50">
              <h3 className="font-semibold text-sm">Add New Relation</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vendor</Label>
                  <Select value={String(selectedVendor)} onValueChange={(v) => setSelectedVendor(parseInt(v))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.items.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={relationType} onValueChange={(v) => setRelationType(v as RelationType)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" className="h-8" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Until</Label>
                  <Input type="date" className="h-8" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Input className="h-8" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateRelation} disabled={!selectedVendor || createRelation.isPending}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!isLoading && (relations && relations.length > 0) && (
            <div className="mb-3">
              <Label className="text-xs">Filter Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground text-xs">
              Loading...
            </div>
          ) : !relations || relations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs">
              No vendor relations found. Click "Add" to create one.
            </div>
          ) : filteredRelations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs">
              No relations match the filter.
            </div>
          ) : (
            <div className="border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Vendor</TableHead>
                    <TableHead className="h-8 text-xs">Type</TableHead>
                    <TableHead className="h-8 text-xs">From</TableHead>
                    <TableHead className="h-8 text-xs">Until</TableHead>
                    <TableHead className="h-8 text-xs">Notes</TableHead>
                    <TableHead className="h-8 text-xs w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRelations.map((relation: any) => (
                    <TableRow key={relation.id}>
                      <TableCell className="py-2 text-xs font-medium">{getVendorName(relation.vendor_id)}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[10px]">{getRelationTypeLabel(relation.relation_type)}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-xs">{formatDate(relation.valid_from)}</TableCell>
                      <TableCell className="py-2 text-xs">{relation.valid_until ? formatDate(relation.valid_until) : '-'}</TableCell>
                      <TableCell className="py-2 text-xs max-w-[150px] truncate">{relation.notes || '-'}</TableCell>
                      <TableCell className="py-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRelation(relation.id)} className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
