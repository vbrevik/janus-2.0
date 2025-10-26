import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  usePersonnelList,
  useCreatePersonnel,
  useUpdatePersonnel,
  useDeletePersonnel,
} from '@/hooks/use-personnel'
import type { Personnel, ClearanceLevel, CreatePersonnelRequest } from '@/types/personnel'

export const Route = createFileRoute('/personnel/')({
  component: PersonnelList,
})

function PersonnelList() {
  const [page, setPage] = useState(1)
  const perPage = 10

  const { data, isLoading, error } = usePersonnelList(page, perPage)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Personnel Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage personnel and their security clearances
              </p>
            </div>
            <CreatePersonnelDialog />
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
  return (
    <TableRow>
      <TableCell className="font-medium">
        {person.first_name} {person.last_name}
      </TableCell>
      <TableCell>{person.email}</TableCell>
      <TableCell>{person.department}</TableCell>
      <TableCell>{person.position}</TableCell>
      <TableCell>
        <ClearanceBadge level={person.clearance_level} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditPersonnelDialog person={person} />
          <DeletePersonnelButton id={person.id} name={`${person.first_name} ${person.last_name}`} />
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

function CreatePersonnelDialog() {
  const [open, setOpen] = useState(false)
  const createMutation = useCreatePersonnel()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: CreatePersonnelRequest = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || undefined,
      department: formData.get('department') as string,
      position: formData.get('position') as string,
      clearance_level: formData.get('clearance_level') as ClearanceLevel,
    }

    await createMutation.mutateAsync(data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Personnel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Personnel</DialogTitle>
            <DialogDescription>
              Enter the details for the new personnel member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PersonnelForm />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPersonnelDialog({ person }: { person: Personnel }) {
  const [open, setOpen] = useState(false)
  const updateMutation = useUpdatePersonnel(person.id)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: CreatePersonnelRequest = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || undefined,
      department: formData.get('department') as string,
      position: formData.get('position') as string,
      clearance_level: formData.get('clearance_level') as ClearanceLevel,
    }

    await updateMutation.mutateAsync(data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
            <DialogDescription>
              Update the personnel member's information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PersonnelForm defaultValues={person} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePersonnelButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false)
  const deleteMutation = useDeletePersonnel()

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Personnel</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PersonnelForm({
  defaultValues,
}: {
  defaultValues?: Partial<Personnel>
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={defaultValues?.first_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={defaultValues?.last_name}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone || ''}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Input
            id="department"
            name="department"
            defaultValue={defaultValues?.department}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            name="position"
            defaultValue={defaultValues?.position}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="clearance_level">Clearance Level *</Label>
        <Select
          id="clearance_level"
          name="clearance_level"
          defaultValue={defaultValues?.clearance_level || 'NONE'}
          required
        >
          <option value="NONE">None</option>
          <option value="CONFIDENTIAL">Confidential</option>
          <option value="SECRET">Secret</option>
          <option value="TOP_SECRET">Top Secret</option>
        </Select>
      </div>
    </>
  )
}
