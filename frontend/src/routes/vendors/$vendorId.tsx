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
import { useVendor, useUpdateVendor } from '@/hooks/use-vendors'
import { useVendorRelations, useCreateRelation, useDeleteRelation, useEntityHierarchy } from '@/hooks/use-relations'
import { usePersonnelList } from '@/hooks/use-personnel'
import { useVendorList } from '@/hooks/use-vendors'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import type { RelationType } from '@/types/relation'

export const Route = createFileRoute('/vendors/$vendorId')({
  component: VendorDetails,
})

function VendorDetails() {
  const { vendorId } = Route.useParams()
  const vendorIdNum = parseInt(vendorId)
  const [activeTab, setActiveTab] = useState<'details' | 'relations'>('details')

  const { data: vendor, isLoading: vendorLoading } = useVendor(vendorIdNum)
  const { data: relations, isLoading: relationsLoading } = useVendorRelations(vendorIdNum)
  const { data: hierarchy } = useEntityHierarchy('vendor', vendorIdNum)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Back Button */}
          <Link to="/vendors">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Vendors
            </Button>
          </Link>

          {vendorLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : vendor ? (
            <>
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold">{vendor.company_name}</h1>
                <p className="text-muted-foreground">Vendor Management</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b">
                <Button
                  variant={activeTab === 'details' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('details')}
                  className="rounded-b-none"
                >
                  Details
                </Button>
                <Button
                  variant={activeTab === 'relations' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('relations')}
                  className="rounded-b-none"
                >
                  Relations <Badge className="ml-2">{relations?.length || 0}</Badge>
                </Button>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && (
                <DetailsTab vendor={vendor} />
              )}

              {activeTab === 'relations' && (
                <RelationsTab
                  vendorId={vendorIdNum}
                  relations={relations}
                  hierarchy={hierarchy}
                  isLoading={relationsLoading}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Vendor not found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function DetailsTab({ vendor }: { vendor: any }) {
  const [editing, setEditing] = useState(false)
  const updateMutation = useUpdateVendor(vendor.id)
  const [form, setForm] = useState({
    company_name: vendor.company_name,
    contact_name: vendor.contact_name,
    contact_email: vendor.contact_email,
    contact_phone: vendor.contact_phone || '',
    contract_number: vendor.contract_number,
    clearance_level: vendor.clearance_level,
  })

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      company_name: form.company_name,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || undefined,
      contract_number: form.contract_number,
      clearance_level: form.clearance_level,
    })
    setEditing(false)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Company Name</Label>
            {editing ? (
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            ) : (
              <p className="text-sm">{form.company_name}</p>
            )}
          </div>
          <div>
            <Label>Contract Number</Label>
            {editing ? (
              <Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
            ) : (
              <p className="text-sm">{form.contract_number}</p>
            )}
          </div>
          <div>
            <Label>Clearance Level</Label>
            {editing ? (
              <Select value={form.clearance_level} onValueChange={(v) => setForm({ ...form, clearance_level: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                  <SelectItem value="SECRET">Secret</SelectItem>
                  <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <ClearanceBadge level={form.clearance_level} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Contact Name</Label>
            {editing ? (
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            ) : (
              <p className="text-sm">{form.contact_name}</p>
            )}
          </div>
          <div>
            <Label>Contact Email</Label>
            {editing ? (
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            ) : (
              <p className="text-sm">{form.contact_email}</p>
            )}
          </div>
          <div>
            <Label>Contact Phone</Label>
            {editing ? (
              <Input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            ) : (
              <p className="text-sm">{form.contact_phone || '-'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {editing ? (
          <>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)}>Edit Vendor</Button>
        )}
      </div>
    </div>
  )
}

function RelationsTab({ vendorId, relations, isLoading }: { 
  vendorId: number
  relations: any[] | undefined
  hierarchy: any[] | undefined
  isLoading: boolean
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const { data: personnelPage } = usePersonnelList(1, 100)
  const { data: vendorsPage } = useVendorList(1, 100)
  const createMutation = useCreateRelation()
  const deleteMutation = useDeleteRelation()

  const [form, setForm] = useState<{
    relation_type: RelationType | ''
    related_vendor_id?: number
    related_personnel_id?: number
    notes?: string
  }>({
    relation_type: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.relation_type) return
    
    // Determine related entity based on which field is filled
    const relatedEntityType = form.related_vendor_id ? 'vendor' : 'personnel'
    const relatedEntityId = form.related_vendor_id || form.related_personnel_id
    
    if (!relatedEntityId) {
      alert('Please select either a vendor or personnel')
      return
    }
    
    await createMutation.mutateAsync({
      entity_type: 'vendor',
      entity_id: vendorId,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      relation_type: form.relation_type as RelationType,
      notes: form.notes,
    })
    setShowAddForm(false)
    setForm({ relation_type: '', notes: '' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Relation Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vendor Relations</h2>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Relation
        </Button>
      </div>

      {/* Add Relation Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Relation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Relation Type</Label>
                <Select value={form.relation_type} onValueChange={(v) => setForm({ ...form, relation_type: v as RelationType })}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sub_vendor">Sub-Vendor</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.relation_type === 'sub_vendor' || form.relation_type === 'partner' || form.relation_type === 'subcontractor') && (
                <div>
                  <Label>Related Vendor</Label>
                  <Select value={form.related_vendor_id?.toString() || ''} onValueChange={(v) => setForm({ ...form, related_vendor_id: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                    <SelectContent>
                      {vendorsPage?.items.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(form.relation_type === 'employee' || form.relation_type === 'consultant') && (
                <div>
                  <Label>Personnel</Label>
                  <Select value={form.related_personnel_id?.toString() || ''} onValueChange={(v) => setForm({ ...form, related_personnel_id: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Select personnel..." /></SelectTrigger>
                    <SelectContent>
                      {personnelPage?.items.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Notes (optional)</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>Add Relation</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Relations List */}
      {relations && relations.length > 0 ? (
        <div className="grid gap-4">
          {relations.map((relation: any) => (
            <Card key={relation.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Badge>{relation.relation_type}</Badge>
                    <p className="text-sm font-medium">
                      {relation.related_entity_type === 'vendor' ? 'Vendor: ' : 'Personnel: '}
                      {relation.related_entity_name || `ID: ${relation.related_entity_id}`}
                    </p>
                    {relation.valid_from && (
                      <p className="text-xs text-muted-foreground">
                        From: {new Date(relation.valid_from).toLocaleDateString()}
                        {relation.valid_until && ` - Until: ${new Date(relation.valid_until).toLocaleDateString()}`}
                      </p>
                    )}
                    {relation.notes && <p className="text-sm text-muted-foreground">{relation.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(relation.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No relations yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ClearanceBadge({ level }: { level: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    NONE: 'secondary',
    CONFIDENTIAL: 'default',
    SECRET: 'destructive',
    TOP_SECRET: 'destructive',
  }
  return <Badge variant={variants[level] || 'secondary'}>{level}</Badge>
}

