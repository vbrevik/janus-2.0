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
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organizations'
import { useOrganizationRelations, useCreateRelation, useDeleteRelation, useEntityHierarchy } from '@/hooks/use-relations'
import { usePersonList } from '@/hooks/use-person'
import { useOrganizationList } from '@/hooks/use-organizations'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import type { RelationType } from '@/types/relation'
import type { Person } from '@/types/person'

export const Route = createFileRoute('/organizations/$organizationId')({
  component: OrganizationDetails,
})

function OrganizationDetails() {
  const { organizationId } = Route.useParams()
  const organizationIdNum = parseInt(organizationId)
  const [activeTab, setActiveTab] = useState<'details' | 'relations'>('details')

  const { data: organization, isLoading: organizationLoading } = useOrganization(organizationIdNum)
  const { data: relations, isLoading: relationsLoading } = useOrganizationRelations(organizationIdNum)
  const { data: hierarchy } = useEntityHierarchy('organization', organizationIdNum)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Back Button */}
          <Link to="/organizations">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Organizations
            </Button>
          </Link>

          {organizationLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : organization ? (
            <>
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold">{organization.company_name}</h1>
                <p className="text-muted-foreground">Organization Management</p>
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
                <DetailsTab organization={organization} />
              )}

              {activeTab === 'relations' && (
                <RelationsTab
                  organizationId={organizationIdNum}
                  relations={relations}
                  hierarchy={hierarchy}
                  isLoading={relationsLoading}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Organization not found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function DetailsTab({ organization }: { organization: any }) {
  const [editing, setEditing] = useState(false)
  const updateMutation = useUpdateOrganization(organization.id)
  const [form, setForm] = useState({
    company_name: organization.company_name,
    contact_name: organization.contact_name,
    contact_email: organization.contact_email,
    contact_phone: organization.contact_phone || '',
    contract_number: organization.contract_number,
    clearance_level: organization.clearance_level,
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
          <Button onClick={() => setEditing(true)}>Edit Organization</Button>
        )}
      </div>
    </div>
  )
}

function RelationsTab({ organizationId, relations, isLoading }: { 
  organizationId: number
  relations: any[] | undefined
  hierarchy: any[] | undefined
  isLoading: boolean
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const { data: personPage } = usePersonList(1, 100) // Changed from personnelPage
  const { data: organizationsPage } = useOrganizationList(1, 100)
  const createMutation = useCreateRelation()
  const deleteMutation = useDeleteRelation()

  const [form, setForm] = useState<{
    relation_type: RelationType | ''
    related_organization_id?: number
    related_person_id?: number
    notes?: string
  }>({
    relation_type: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.relation_type) return
    
    // Determine related entity based on which field is filled
    const relatedEntityType = form.related_organization_id ? 'organization' : 'person'
    const relatedEntityId = form.related_organization_id || form.related_person_id
    
    if (!relatedEntityId) {
      alert('Please select either an organization or person')
      return
    }
    
    await createMutation.mutateAsync({
      entity_type: 'organization',
      entity_id: organizationId,
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
        <h2 className="text-xl font-semibold">Organization Relations</h2>
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
                  <Label>Related Organization</Label>
                  <Select value={form.related_organization_id?.toString() || ''} onValueChange={(v) => setForm({ ...form, related_organization_id: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Select organization..." /></SelectTrigger>
                    <SelectContent>
                      {organizationsPage?.items.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(form.relation_type === 'employee' || form.relation_type === 'consultant') && (
                <div>
                  <Label>Person</Label>
                  <Select value={form.related_person_id?.toString() || ''} onValueChange={(v) => setForm({ ...form, related_person_id: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Select person..." /></SelectTrigger>
                    <SelectContent>
                      {personPage?.items.map((p: Person) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.first_name && p.last_name 
                            ? `${p.first_name} ${p.last_name}`
                            : p.username || p.email || `Person #${p.id}`}
                        </SelectItem>
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
                      {relation.related_entity_type === 'organization' ? 'Organization: ' : 'Personnel: '}
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

