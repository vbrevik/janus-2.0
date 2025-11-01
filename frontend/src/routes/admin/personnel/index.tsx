import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import {
  usePersonnelList,
  useCreatePersonnel,
  useUpdatePersonnel,
  useDeletePersonnel,
} from '@/hooks/use-personnel'
import { Link } from '@tanstack/react-router'
import type { Personnel, ClearanceLevel, CreatePersonnelRequest } from '@/types/personnel'

export const Route = createFileRoute('/admin/personnel/')({
  component: PersonnelList,
})

function PersonnelList() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const perPage = 10

  const { data, isLoading, error } = usePersonnelList(page, perPage)

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Personnel Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage personnel and their security clearances
              </p>
            </div>
            <Button onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" />
              {showCreate ? 'Hide New Row' : 'Add Personnel'}
            </Button>
          </div>

          {/* Table */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading personnel: {error.message}
            </div>
          )}

          {data && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Clearance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showCreate && (
                      <CreatePersonnelRow onDone={() => setShowCreate(false)} />
                    )}
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No personnel found. Create your first entry!
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.items.map((person) => (
                        <PersonnelRow key={person.id} person={person} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * perPage + 1} to{' '}
                    {Math.min(page * perPage, data.total)} of {data.total} results
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {data.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                      disabled={page === data.total_pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function PersonnelRow({ person }: { person: Personnel }) {
  const [editing, setEditing] = useState(false)
  const updateMutation = useUpdatePersonnel(person.id)
  const deleteMutation = useDeletePersonnel()

  const [form, setForm] = useState({
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    phone: person.phone || '',
    department: person.department,
    position: person.position,
    clearance_level: person.clearance_level as ClearanceLevel,
  })

  const onSave = async () => {
    await updateMutation.mutateAsync({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || undefined,
      department: form.department,
      position: form.position,
      clearance_level: form.clearance_level,
    })
    setEditing(false)
  }

  const onDelete = async () => {
    await deleteMutation.mutateAsync(person.id)
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
        ) : (
          <Link to="/admin/personnel/$personnelId" params={{ personnelId: person.id.toString() }} className="hover:underline flex items-center gap-2">
            {person.first_name} {person.last_name}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </Link>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        ) : (
          person.email
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        ) : (
          person.department
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        ) : (
          person.position
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Select
            value={form.clearance_level}
            onValueChange={(v) => setForm({ ...form, clearance_level: v as ClearanceLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
              <SelectItem value="SECRET">Secret</SelectItem>
              <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <ClearanceBadge level={person.clearance_level} />
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={onSave} disabled={updateMutation.isPending}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function CreatePersonnelRow({ onDone }: { onDone: () => void }) {
  const createMutation = useCreatePersonnel()
  const [form, setForm] = useState<CreatePersonnelRequest>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    clearance_level: 'NONE' as ClearanceLevel,
  })

  const onCreate = async () => {
    await createMutation.mutateAsync({
      ...form,
      phone: form.phone || undefined,
    })
    onDone()
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      clearance_level: 'NONE' as ClearanceLevel,
    })
  }

  return (
    <TableRow className="bg-accent/30">
      <TableCell className="font-medium">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
      </TableCell>
      <TableCell>
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
      </TableCell>
      <TableCell>
        <Select value={form.clearance_level} onValueChange={(v) => setForm({ ...form, clearance_level: v as ClearanceLevel })}>
          <SelectTrigger>
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
            <SelectItem value="SECRET">Secret</SelectItem>
            <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={onCreate} disabled={createMutation.isPending}>
            <Check className="h-4 w-4 mr-1" /> Add
          </Button>
          <Button size="sm" variant="outline" onClick={onDone}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function ClearanceBadge({ level }: { level: ClearanceLevel }) {
  const variants: Record<ClearanceLevel, 'default' | 'secondary' | 'warning' | 'destructive'> = {
    NONE: 'secondary',
    CONFIDENTIAL: 'default',
    SECRET: 'warning',
    TOP_SECRET: 'destructive',
  }

  return <Badge variant={variants[level]}>{level}</Badge>
}

// Inline create handled by CreatePersonnelRow

// Inline editing replaces EditPersonnelDialog

// Delete handled inline in PersonnelRow

// Removed old modal form component; inline fields are used instead
