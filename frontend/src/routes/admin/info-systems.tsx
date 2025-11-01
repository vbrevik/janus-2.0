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
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, Server } from 'lucide-react'
import {
  useInfoSystemsList,
  useCreateInfoSystem,
  useUpdateInfoSystem,
  useDeleteInfoSystem,
} from '@/hooks/use-info-systems'
import type { InfoSystem, CreateInfoSystemRequest, Environment, SystemStatus } from '@/types/info-system'

export const Route = createFileRoute('/admin/info-systems')({
  component: InfoSystemsList,
})

function InfoSystemsList() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const perPage = 10

  const { data, isLoading, error } = useInfoSystemsList(page, perPage)

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Information Systems</h1>
                <p className="text-muted-foreground mt-1">
                  Manage information systems and infrastructure
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" />
              {showCreate ? 'Hide New Row' : 'Add System'}
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
              Error loading systems: {error.message}
            </div>
          )}

          {data && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>System Name</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Managed By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showCreate && <CreateInfoSystemRow onDone={() => setShowCreate(false)} />}
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No systems found. Create your first entry!
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.items.map((system) => (
                        <InfoSystemRow key={system.id} system={system} />
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

function InfoSystemRow({ system }: { system: InfoSystem }) {
  const [editing, setEditing] = useState(false)
  const updateMutation = useUpdateInfoSystem(system.id)
  const deleteMutation = useDeleteInfoSystem()

  const [form, setForm] = useState({
    system_name: system.system_name,
    description: system.description || '',
    environment: system.environment,
    status: system.status,
    ip_address: system.ip_address || '',
    domain: system.domain || '',
    managed_by: system.managed_by || '',
  })

  const onSave = async () => {
    // Validation
    if (!form.system_name.trim()) {
      alert('System name is required')
      return
    }

    try {
      await updateMutation.mutateAsync({
        system_name: form.system_name,
        description: form.description || null,
        environment: form.environment,
        status: form.status,
        ip_address: form.ip_address || null,
        domain: form.domain || null,
        managed_by: form.managed_by || null,
      })
      setEditing(false)
      alert('System updated successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update system')
    }
  }

  const onDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${system.system_name}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(system.id)
      alert('System deleted successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete system')
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {editing ? (
          <div className="space-y-2">
            <Input value={form.system_name} onChange={(e) => setForm({ ...form, system_name: e.target.value })} />
            <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="Domain" />
          </div>
        ) : (
          <div>
            <p>{system.system_name}</p>
            {system.domain && <p className="text-xs text-muted-foreground">{system.domain}</p>}
          </div>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v as Environment })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEV">DEV</SelectItem>
              <SelectItem value="TEST">TEST</SelectItem>
              <SelectItem value="PROD">PROD</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <EnvironmentBadge env={system.environment} />
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SystemStatus })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={system.status} />
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input 
            value={form.description || ''} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
            placeholder="Description"
          />
        ) : (
          system.description || '-'
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input 
            value={form.ip_address || ''} 
            onChange={(e) => setForm({ ...form, ip_address: e.target.value })} 
            placeholder="IP Address"
          />
        ) : (
          system.ip_address || '-'
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input value={form.domain || ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="Domain" />
        ) : (
          system.domain || '-'
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input value={form.managed_by} onChange={(e) => setForm({ ...form, managed_by: e.target.value })} placeholder="Managed by" />
        ) : (
          system.managed_by || '-'
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={onSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditing(false)
                // Reset form to original values
                setForm({
                  system_name: system.system_name,
                  description: system.description || '',
                  environment: system.environment,
                  status: system.status,
                  ip_address: system.ip_address || '',
                  domain: system.domain || '',
                  managed_by: system.managed_by || '',
                })
              }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function CreateInfoSystemRow({ onDone }: { onDone: () => void }) {
  const createMutation = useCreateInfoSystem()
  const [form, setForm] = useState<CreateInfoSystemRequest>({
    system_name: '',
    description: null,
    environment: 'PROD' as Environment,
    status: 'ACTIVE' as SystemStatus,
    ip_address: null,
    domain: null,
    managed_by: null,
  })

  const onCreate = async () => {
    // Validation
    if (!form.system_name.trim()) {
      alert('System name is required')
      return
    }

    try {
      await createMutation.mutateAsync({
        ...form,
        description: form.description || null,
        ip_address: form.ip_address || null,
        domain: form.domain || null,
        managed_by: form.managed_by || null,
      })
      onDone()
      setForm({
        system_name: '',
        description: null,
        environment: 'PROD' as Environment,
        status: 'ACTIVE' as SystemStatus,
        ip_address: null,
        domain: null,
        managed_by: null,
      })
      alert('System created successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create system')
    }
  }

  return (
    <TableRow className="bg-accent/30">
      <TableCell className="font-medium">
        <div className="space-y-2">
          <Input placeholder="System name" value={form.system_name} onChange={(e) => setForm({ ...form, system_name: e.target.value })} />
          <Input placeholder="Domain" value={form.domain || ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
        </div>
      </TableCell>
      <TableCell>
        <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v as Environment })}>
          <SelectTrigger>
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEV">DEV</SelectItem>
            <SelectItem value="TEST">TEST</SelectItem>
            <SelectItem value="PROD">PROD</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SystemStatus })}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
            <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="IP Address" value={form.ip_address || ''} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="Domain" value={form.domain || ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="Managed by" value={form.managed_by || ''} onChange={(e) => setForm({ ...form, managed_by: e.target.value })} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={onCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" /> Add
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onDone}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EnvironmentBadge({ env }: { env: Environment }) {
  const variants: Record<Environment, 'default' | 'secondary' | 'warning'> = {
    DEV: 'secondary',
    TEST: 'warning',
    PROD: 'default',
  }

  return <Badge variant={variants[env]}>{env}</Badge>
}

function StatusBadge({ status }: { status: SystemStatus }) {
  const variants: Record<SystemStatus, 'default' | 'secondary' | 'warning' | 'destructive'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    MAINTENANCE: 'warning',
  }

  return <Badge variant={variants[status]}>{status}</Badge>
}

