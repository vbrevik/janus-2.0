import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePersonnel } from '@/hooks/use-personnel'
import { useCreateVendorRelation, useDeleteVendorRelation } from '@/hooks/use-vendor-relations'
import { useVendorList } from '@/hooks/use-vendors'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import type { RelationType } from '@/types/vendor-relation'

export const Route = createFileRoute('/personnel/$personnelId')({
  component: PersonnelDetails,
})

function PersonnelDetails() {
  const { personnelId } = Route.useParams()
  const personnelIdNum = parseInt(personnelId)
  const [activeTab, setActiveTab] = useState<'details' | 'vendor-relations'>('details')

  const { data: personnel, isLoading: personnelLoading } = usePersonnel(personnelIdNum)
  
  // Vendor relations will be fetched in the tab component
  
  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Back Button */}
          <Link to="/personnel">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Personnel
            </Button>
          </Link>

          {personnelLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : personnel ? (
            <>
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold">{personnel.first_name} {personnel.last_name}</h1>
                <p className="text-muted-foreground">{personnel.email}</p>
              </div>

              {/* Tabs */}
              <div className="border-b">
                <nav className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('vendor-relations')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'vendor-relations' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                    }`}
                  >
                    Vendor Relations
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && <DetailsTab personnel={personnel} />}
              {activeTab === 'vendor-relations' && (
                <VendorRelationsTab personnelId={personnelIdNum} personnelName={`${personnel.first_name} ${personnel.last_name}`} />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Personnel not found
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function DetailsTab({ personnel }: { personnel: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <p className="text-sm font-medium">{personnel.first_name}</p>
          </div>
          <div>
            <Label>Last Name</Label>
            <p className="text-sm font-medium">{personnel.last_name}</p>
          </div>
          <div>
            <Label>Email</Label>
            <p className="text-sm font-medium">{personnel.email}</p>
          </div>
          <div>
            <Label>Phone</Label>
            <p className="text-sm font-medium">{personnel.phone || 'N/A'}</p>
          </div>
          <div>
            <Label>Department</Label>
            <p className="text-sm font-medium">{personnel.department || 'N/A'}</p>
          </div>
          <div>
            <Label>Position</Label>
            <p className="text-sm font-medium">{personnel.position || 'N/A'}</p>
          </div>
          <div>
            <Label>Clearance Level</Label>
            <Badge>{personnel.clearance_level}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VendorRelationsTab({ personnelId, personnelName }: { personnelId: number; personnelName: string }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<number>(0)
  const [relationType, setRelationType] = useState<RelationType>('employee')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  
  const { data: vendors } = useVendorList(1, 100)
  const createRelation = useCreateVendorRelation()
  const deleteRelation = useDeleteVendorRelation()
  
  // Get relations - for now, we'll need to fetch from each vendor
  // TODO: Implement a backend endpoint to get relations by personnel_id
  const personnelRelations: any[] = []

  const handleCreateRelation = async () => {
    if (!selectedVendor) return
    
    await createRelation.mutateAsync({
      vendor_id: selectedVendor,
      related_personnel_id: personnelId,
      relation_type: relationType,
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
      notes: notes || undefined,
    })
    
    // Reset form
    setShowAddForm(false)
    setSelectedVendor(0)
    setRelationType('employee')
    setValidFrom('')
    setValidUntil('')
    setNotes('')
  }

  const handleDeleteRelation = async (relationId: number) => {
    if (confirm('Are you sure you want to delete this relation?')) {
      await deleteRelation.mutateAsync(relationId)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vendor Relations for {personnelName}</CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor Relation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="border rounded-lg p-4 mb-4 space-y-4 bg-muted/50">
              <h3 className="font-semibold">Add New Relation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendor</Label>
                  <Select value={String(selectedVendor)} onValueChange={(v) => setSelectedVendor(parseInt(v))}>
                    <SelectTrigger>
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
                  <Label>Relation Type</Label>
                  <Select value={relationType} onValueChange={(v) => setRelationType(v as RelationType)}>
                    <SelectTrigger>
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
                  <Label>Valid From</Label>
                  <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateRelation} disabled={!selectedVendor || createRelation.isPending}>
                  Create Relation
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {personnelRelations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendor relations found. Click "Add Vendor Relation" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {personnelRelations.map((rel) => (
                <div key={rel.id} className="border rounded p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Vendor ID: {rel.vendor_id}</p>
                    <p className="text-sm text-muted-foreground">
                      Type: <Badge>{rel.relation_type}</Badge>
                    </p>
                    {rel.valid_from && (
                      <p className="text-sm text-muted-foreground">
                        {rel.valid_from} {rel.valid_until ? `to ${rel.valid_until}` : 'ongoing'}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRelation(rel.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
