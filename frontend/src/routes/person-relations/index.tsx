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
// Textarea component - using Input if not available
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { usePersonList } from '@/hooks/use-person'
import { useRelations, useCreateRelation, useUpdateRelation, useDeleteRelation } from '@/hooks/use-relations'
import { Plus, Pencil, Trash2, Users, ArrowLeft } from 'lucide-react'
import type { RelationType, RelationWithNames } from '@/types/relation'

export const Route = createFileRoute('/person-relations/')({
  component: PersonRelationsPage,
})

function PersonRelationsPage() {
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRelation, setEditingRelation] = useState<RelationWithNames | null>(null)
  const [direction, setDirection] = useState<'outgoing' | 'incoming' | 'both'>('both')

  const { data: personsData } = usePersonList(1, 1000)
  const persons = personsData?.items || []

  const { data: relations, isLoading } = useRelations(
    'person',
    selectedPersonId || 0,
    { enabled: selectedPersonId !== null, direction }
  )

  // Filter to only person-to-person relations
  const personRelations = relations?.filter(rel => 
    rel.related_entity_type === 'person'
  ) || []

  const createMutation = useCreateRelation()
  const updateMutation = useUpdateRelation()
  const deleteMutation = useDeleteRelation()

  const getRelationTypeLabel = (type: RelationType): string => {
    const labels: Record<RelationType, string> = {
      // Organizational
      'sub_vendor': 'Sub-Vendor',
      'subcontractor': 'Subcontractor',
      'employee': 'Employee',
      'consultant': 'Consultant',
      'partner': 'Partner',
      // Professional/Organizational Person-to-Person
      'manager': 'Manager',
      'supervisor': 'Supervisor',
      'subordinate': 'Subordinate',
      'reports_to': 'Reports To',
      'colleague': 'Colleague',
      'peer': 'Peer',
      'team_member': 'Team Member',
      // Schema.org Personal Relations
      'knows': 'Knows',
      'related_to': 'Related To',
      'parent': 'Parent',
      'child': 'Child',
      'sibling': 'Sibling',
      'spouse': 'Spouse',
      'follows': 'Follows',
    }
    return labels[type] || type
  }

  const getRelationCategory = (type: RelationType): string => {
    if (['parent', 'child', 'sibling', 'spouse', 'related_to'].includes(type)) {
      return 'Family'
    }
    if (['manager', 'supervisor', 'subordinate', 'reports_to', 'colleague', 'peer', 'team_member'].includes(type)) {
      return 'Professional'
    }
    if (['knows', 'follows'].includes(type)) {
      return 'Social'
    }
    return 'Other'
  }

  const getPersonName = (personId: number): string => {
    const person = persons.find(p => p.id === personId)
    return person ? `${person.first_name} ${person.last_name}` : `Person #${personId}`
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                <h1 className="text-3xl font-bold">Person Relations Management</h1>
              </div>
              <p className="text-muted-foreground mt-1">
                Manage relationships between persons based on Schema.org standards
              </p>
            </div>
            <Link to="/person">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Persons
              </Button>
            </Link>
          </div>

          {/* Person Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Person</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Person</Label>
                  <Select
                    value={selectedPersonId?.toString() || ''}
                    onValueChange={(v) => setSelectedPersonId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a person to view their relations" />
                    </SelectTrigger>
                    <SelectContent>
                      {persons.map((person) => (
                        <SelectItem key={person.id} value={person.id.toString()}>
                          {person.first_name} {person.last_name} {person.email ? `(${person.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <Label>Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both Directions</SelectItem>
                      <SelectItem value="outgoing">Outgoing</SelectItem>
                      <SelectItem value="incoming">Incoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedPersonId && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Relation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Relations List */}
          {selectedPersonId && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Relations for {getPersonName(selectedPersonId)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({personRelations.length} person-to-person {personRelations.length === 1 ? 'relation' : 'relations'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : personRelations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No person-to-person relations found. Click "Add Relation" to create one.
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Related Person</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Valid From</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personRelations.map((relation) => (
                          <TableRow key={relation.id}>
                            <TableCell className="font-medium">
                              {relation.related_entity_name || `Person #${relation.related_entity_id}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getRelationTypeLabel(relation.relation_type as RelationType)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getRelationCategory(relation.relation_type as RelationType)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(relation.valid_from).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {relation.valid_until ? new Date(relation.valid_until).toLocaleDateString() : 'Ongoing'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {relation.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRelation(relation)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this relation?')) {
                                      deleteMutation.mutate(relation.id)
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create/Edit Dialog */}
          {(showCreateDialog || editingRelation) && (
            <RelationDialog
              personId={selectedPersonId!}
              relation={editingRelation}
              persons={persons}
              onClose={() => {
                setShowCreateDialog(false)
                setEditingRelation(null)
              }}
              onCreate={async (data) => {
                await createMutation.mutateAsync(data)
                setShowCreateDialog(false)
              }}
              onUpdate={async (id, data) => {
                await updateMutation.mutateAsync({ id, data })
                setEditingRelation(null)
              }}
              getRelationTypeLabel={getRelationTypeLabel}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

interface RelationDialogProps {
  personId: number
  relation: RelationWithNames | null
  persons: Array<{ id: number; first_name: string | null; last_name: string | null; email?: string | null }>
  onClose: () => void
  onCreate: (data: any) => Promise<void>
  onUpdate: (id: number, data: any) => Promise<void>
  getRelationTypeLabel: (type: RelationType) => string
}

function RelationDialog({
  personId,
  relation,
  persons,
  onClose,
  onCreate,
  onUpdate,
  getRelationTypeLabel,
}: RelationDialogProps) {
  const [relatedPersonId, setRelatedPersonId] = useState<number>(
    relation?.related_entity_id || 0
  )
  const [relationType, setRelationType] = useState<RelationType>(
    (relation?.relation_type as RelationType) || 'knows'
  )
  const [validFrom, setValidFrom] = useState<string>(
    relation?.valid_from ? new Date(relation.valid_from).toISOString().split('T')[0] : ''
  )
  const [validUntil, setValidUntil] = useState<string>(
    relation?.valid_until ? new Date(relation.valid_until).toISOString().split('T')[0] : ''
  )
  const [notes, setNotes] = useState<string>(relation?.notes || '')

  const isEditing = !!relation

  // Note: Person-to-person relation types are handled in the Select component
  // All available RelationType values are already defined in the type system

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!relatedPersonId || relatedPersonId === personId) {
      alert('Please select a different person')
      return
    }

    const relationData = {
      relation_type: relationType,
      notes: notes || undefined,
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
    }

    try {
      if (isEditing) {
        await onUpdate(relation.id, relationData)
      } else {
        await onCreate({
          entity_type: 'person',
          entity_id: personId,
          related_entity_type: 'person',
          related_entity_id: relatedPersonId,
          ...relationData,
        })
      }
      onClose()
    } catch (error) {
      console.error('Error saving relation:', error)
      alert('Failed to save relation')
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Person Relation' : 'Create Person Relation'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Related Person *</Label>
            <Select
              value={relatedPersonId.toString()}
              onValueChange={(v) => setRelatedPersonId(parseInt(v))}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>
              <SelectContent>
                {persons
                  .filter(p => p.id !== personId)
                  .map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.first_name} {person.last_name} {person.email ? `(${person.email})` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Relation Type *</Label>
            <Select
              value={relationType}
              onValueChange={(v) => setRelationType(v as RelationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Professional/Organizational Relations */}
                {['manager', 'supervisor', 'subordinate', 'reports_to', 'colleague', 'peer', 'team_member'].map((type) => (
                  <SelectItem key={type} value={type}>
                    {getRelationTypeLabel(type as RelationType)}
                  </SelectItem>
                ))}
                {/* Separator */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  Personal Relations (Schema.org)
                </div>
                {/* Schema.org Personal Relations */}
                {['knows', 'related_to', 'parent', 'child', 'sibling', 'spouse', 'follows'].map((type) => (
                  <SelectItem key={type} value={type}>
                    {getRelationTypeLabel(type as RelationType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Based on Schema.org Person properties
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valid From</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Valid Until (Optional)</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information about this relationship..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update Relation' : 'Create Relation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

