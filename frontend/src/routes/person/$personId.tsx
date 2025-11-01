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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePerson } from '@/hooks/use-person'
import { useCreateVendorRelation, useDeleteVendorRelation } from '@/hooks/use-vendor-relations'
import { useOrganizationList } from '@/hooks/use-organizations'
import { useNDAList, useCreateNDA } from '@/hooks/use-nda'
import { ArrowLeft, Trash2, Plus, FileText, Send } from 'lucide-react'
import type { RelationType } from '@/types/vendor-relation'
import type { Person } from '@/types/person'
import type { NDA } from '@/types/nda'

export const Route = createFileRoute('/person/$personId')({
  component: PersonnelDetails,
})

function PersonnelDetails() {
  const { personId } = Route.useParams()
  const personIdNum = parseInt(personId)
  const [activeTab, setActiveTab] = useState<'details' | 'vendor-relations' | 'ndas'>('details')

  const { data: person, isLoading: personLoading } = usePerson(personIdNum) // Changed from usePersonnel/personnel
  
  // Vendor relations will be fetched in the tab component
  
  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Back Button */}
          <Link to="/person">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Personnel
            </Button>
          </Link>

          {personLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : person ? (
            <>
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold">
                  {person.first_name && person.last_name 
                    ? `${person.first_name} ${person.last_name}`
                    : person.username || person.email || 'Unnamed Person'}
                </h1>
                <p className="text-muted-foreground">{person.email || person.username || 'No contact info'}</p>
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
                  <button
                    onClick={() => setActiveTab('ndas')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'ndas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                    }`}
                  >
                    NDAs
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && <DetailsTab person={person} />}
              {activeTab === 'vendor-relations' && (
                <VendorRelationsTab personId={personIdNum} personName={
                  person.first_name && person.last_name 
                    ? `${person.first_name} ${person.last_name}` 
                    : person.username || person.email || `Person #${person.id}`
                } />
              )}
              {activeTab === 'ndas' && (
                <NDATab personId={personIdNum} />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Person not found
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function DetailsTab({ person }: { person: Person }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <p className="text-sm font-medium">{person.first_name || 'N/A'}</p>
          </div>
          <div>
            <Label>Last Name</Label>
            <p className="text-sm font-medium">{person.last_name || 'N/A'}</p>
          </div>
          <div>
            <Label>Email</Label>
            <p className="text-sm font-medium">{person.email || 'N/A'}</p>
          </div>
          <div>
            <Label>Phone</Label>
            <p className="text-sm font-medium">{person.phone || 'N/A'}</p>
          </div>
          <div>
            <Label>Username</Label>
            <p className="text-sm font-medium">{person.username || 'N/A'}</p>
          </div>
          <div>
            <Label>Role</Label>
            <p className="text-sm font-medium">{person.role || 'N/A'}</p>
          </div>
          <div>
            <Label>Department</Label>
            <p className="text-sm font-medium">{person.department || 'N/A'}</p>
          </div>
          <div>
            <Label>Position</Label>
            <p className="text-sm font-medium">{person.position || 'N/A'}</p>
          </div>
          <div>
            <Label>Clearance Level</Label>
            <Badge>{person.clearance_level || 'UNCLASSIFIED'}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VendorRelationsTab({ personId, personName }: { personId: number; personName: string }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<number>(0)
  const [relationType, setRelationType] = useState<RelationType>('employee')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  
  const { data: organizations } = useOrganizationList(1, 100) // Changed from useVendorList/vendors
  const createRelation = useCreateVendorRelation()
  const deleteRelation = useDeleteVendorRelation()
  
  // Get relations - for now, we'll need to fetch from each vendor
  // TODO: Implement a backend endpoint to get relations by person_id
  const personnelRelations: any[] = []

  const handleCreateRelation = async () => {
    if (!selectedVendor) {
      alert('Please select a vendor')
      return
    }
    
    try {
      await createRelation.mutateAsync({
        vendor_id: selectedVendor,
        related_person_id: personId,
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
      
      alert('Vendor relation created successfully!')
    } catch (error) {
      console.error('Error creating vendor relation:', error)
      alert(`Error creating vendor relation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
            <CardTitle>Organization Relations for {personName}</CardTitle>
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
                      {organizations?.items.map((v) => (
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

function NDATab({ personId }: { personId: number }) {
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [newNDA, setNewNDA] = useState({
    title: '',
    content: '',
    version: '',
    expires_at: '',
    sent_by_vendor_id: '',
  })
  
  const { data: ndas, isLoading, refetch } = useNDAList({ person_id: personId })
  const { data: organizations } = useOrganizationList(1, 100) // Changed from useVendorList/vendors
  const createNDA = useCreateNDA()
  
  const handleSendNDA = async () => {
    if (!newNDA.title || !newNDA.content) {
      alert('Please fill in title and content')
      return
    }
    
    try {
      await createNDA.mutateAsync({
        person_id: personId,
        title: newNDA.title,
        content: newNDA.content,
        version: newNDA.version || undefined,
        expires_at: newNDA.expires_at || undefined,
        sent_by_vendor_id: newNDA.sent_by_vendor_id ? parseInt(newNDA.sent_by_vendor_id) : undefined,
      })
      
      setShowSendDialog(false)
      setNewNDA({ title: '', content: '', version: '', expires_at: '', sent_by_vendor_id: '' })
      refetch()
      alert('NDA sent successfully!')
    } catch (error) {
      console.error('Error sending NDA:', error)
      alert(`Error sending NDA: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{status}</Badge>
      case 'SIGNED':
        return <Badge className="bg-green-100 text-green-800">{status}</Badge>
      case 'EXPIRED':
      case 'REVOKED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Non-Disclosure Agreements
            </CardTitle>
            <Button onClick={() => setShowSendDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send NDA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : ndas && ndas.length > 0 ? (
            <div className="space-y-3">
              {ndas.map((nda: NDA) => (
                <Card key={nda.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{nda.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Version {nda.version} • {formatDate(nda.issued_at)}
                          {nda.sent_at && ` • Sent: ${formatDate(nda.sent_at)}`}
                          {nda.signed_at && ` • Signed: ${formatDate(nda.signed_at)}`}
                        </p>
                      </div>
                      {getStatusBadge(nda.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-3 rounded-lg max-h-[150px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">{nda.content}</pre>
                    </div>
                    {nda.rejection_reason && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Rejected:</strong> {nda.rejection_reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No NDAs found. Click "Send NDA" to create one.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Send NDA Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send NDA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nda-title">Title *</Label>
              <Input
                id="nda-title"
                value={newNDA.title}
                onChange={(e) => setNewNDA({ ...newNDA, title: e.target.value })}
                placeholder="e.g., Standard NDA 2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nda-version">Version</Label>
                <Input
                  id="nda-version"
                  value={newNDA.version}
                  onChange={(e) => setNewNDA({ ...newNDA, version: e.target.value })}
                  placeholder="e.g., 1.0"
                />
              </div>
              <div>
                <Label htmlFor="nda-expires">Expires At</Label>
                <Input
                  id="nda-expires"
                  type="date"
                  value={newNDA.expires_at}
                  onChange={(e) => setNewNDA({ ...newNDA, expires_at: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="nda-vendor">Sent By Vendor (Optional)</Label>
              <Select value={newNDA.sent_by_vendor_id} onValueChange={(v) => setNewNDA({ ...newNDA, sent_by_vendor_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {organizations?.items.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nda-content">Content *</Label>
              <textarea
                id="nda-content"
                className="w-full min-h-[200px] p-2 border rounded-md text-sm font-mono"
                value={newNDA.content}
                onChange={(e) => setNewNDA({ ...newNDA, content: e.target.value })}
                placeholder="Enter NDA content..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendNDA} 
                disabled={!newNDA.title || !newNDA.content || createNDA.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createNDA.isPending ? 'Sending...' : 'Send NDA'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
