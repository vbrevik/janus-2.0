import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit2, Trash2, Check, X, Shield } from 'lucide-react'
import {
  useRolesList,
  usePermissionsList,
  useRolePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useSetRolePermissions,
} from '@/hooks/use-roles'
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '@/types/roles'

export const Route = createFileRoute('/roles/')({
  component: RolesManagement,
})

function RolesManagement() {
  const { data: roles, isLoading, error } = useRolesList()

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Roles & Permissions</h1>
                <p className="text-muted-foreground mt-1">
                  Manage roles and their assigned permissions
                </p>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading roles: {error.message}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Roles Table */}
          {roles && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No roles found. Create your first role!
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <RoleRow key={role.id} role={role} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Create Role Dialog */}
          <CreateRoleDialog />
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function RoleRow({ role }: { role: Role }) {
  const [editing, setEditing] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const updateMutation = useUpdateRole(role.id)
  const deleteMutation = useDeleteRole()

  const [form, setForm] = useState({
    name: role.name,
    description: role.description || '',
  })

  const onSave = async () => {
    await updateMutation.mutateAsync({
      name: form.name,
      description: form.description || null,
    })
    setEditing(false)
  }

  const onCancel = () => {
    setForm({
      name: role.name,
      description: role.description || '',
    })
    setEditing(false)
  }

  const onDelete = async () => {
    if (confirm(`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(role.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          {editing ? (
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-48"
            />
          ) : (
            role.name
          )}
        </TableCell>
        <TableCell>
          {editing ? (
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full"
            />
          ) : (
            role.description || <span className="text-muted-foreground">No description</span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(role.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={onSave} disabled={updateMutation.isPending}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPermissions(true)}
                >
                  Permissions
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Permissions Dialog */}
      {showPermissions && (
        <RolePermissionsDialog
          role={role}
          open={showPermissions}
          onOpenChange={setShowPermissions}
        />
      )}
    </>
  )
}

function CreateRoleDialog() {
  const [open, setOpen] = useState(false)
  const createMutation = useCreateRole()

  const [form, setForm] = useState<CreateRoleRequest>({
    name: '',
    description: null,
  })

  const onCreate = async () => {
    if (!form.name.trim()) {
      alert('Role name is required')
      return
    }
    await createMutation.mutateAsync(form)
    setOpen(false)
    setForm({ name: '', description: null })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a new role to assign permissions to users.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name *</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., auditor, manager"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-description">Description (Optional)</Label>
            <Input
              id="role-description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value || null })}
              placeholder="Brief description of this role's purpose"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RolePermissionsDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: permissions } = usePermissionsList()
  const { data: rolePermissions } = useRolePermissions(role.id)
  const setPermissionsMutation = useSetRolePermissions(role.id)

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  // Sync selected permissions when rolePermissions changes or dialog opens
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(new Set(rolePermissions))
    }
  }, [rolePermissions, open])

  const handlePermissionToggle = (permissionKey: string) => {
    const newSet = new Set(selectedPermissions)
    if (newSet.has(permissionKey)) {
      newSet.delete(permissionKey)
    } else {
      newSet.add(permissionKey)
    }
    setSelectedPermissions(newSet)
  }

  const handleSave = async () => {
    await setPermissionsMutation.mutateAsync({
      permissions: Array.from(selectedPermissions),
    })
    onOpenChange(false)
  }

  const handleSelectAll = () => {
    if (permissions) {
      if (selectedPermissions.size === permissions.length) {
        setSelectedPermissions(new Set())
      } else {
        setSelectedPermissions(new Set(permissions.map((p) => p.key)))
      }
    }
  }

  if (!permissions) {
    return null
  }

  // Group permissions by resource
  const groupedPermissions: Record<string, typeof permissions> = {}
  permissions.forEach((perm) => {
    const resource = perm.key.split('.')[0]
    if (!groupedPermissions[resource]) {
      groupedPermissions[resource] = []
    }
    groupedPermissions[resource].push(perm)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions: {role.name}</DialogTitle>
          <DialogDescription>
            Assign permissions to this role. Users with this role will have access to the selected permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Select All */}
          <div className="flex items-center justify-between pb-2 border-b">
            <Label>Permissions</Label>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedPermissions.size === permissions.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Grouped Permissions */}
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {resource}
              </h4>
              <div className="space-y-2 pl-4">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={selectedPermissions.has(perm.key)}
                      onCheckedChange={() => handlePermissionToggle(perm.key)}
                    />
                    <Label
                      htmlFor={`perm-${perm.id}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{perm.key}</span>
                        {perm.description && (
                          <span className="text-xs text-muted-foreground">
                            - {perm.description}
                          </span>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={setPermissionsMutation.isPending}>
              {setPermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
