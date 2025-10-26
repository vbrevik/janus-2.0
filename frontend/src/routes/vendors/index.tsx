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
  useVendorList,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-vendors'
import type { Vendor, ClearanceLevel, CreateVendorRequest } from '@/types/vendor'

export const Route = createFileRoute('/vendors/')({
  component: VendorList,
})

function VendorList() {
  const [page, setPage] = useState(1)
  const perPage = 10

  const { data, isLoading, error } = useVendorList(page, perPage)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Vendor Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage vendors and their security clearances
              </p>
            </div>
            <CreateVendorDialog />
          </div>

          {/* Table */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading vendors: {error.message}
            </div>
          )}

          {data && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Clearance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No vendors found. Create your first entry!
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.items.map((vendor) => (
                        <VendorRow key={vendor.id} vendor={vendor} />
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

function VendorRow({ vendor }: { vendor: Vendor }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{vendor.company_name}</TableCell>
      <TableCell>{vendor.contact_name}</TableCell>
      <TableCell>{vendor.contact_email}</TableCell>
      <TableCell>{vendor.contract_number}</TableCell>
      <TableCell>
        <ClearanceBadge level={vendor.clearance_level} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditVendorDialog vendor={vendor} />
          <DeleteVendorButton
            id={vendor.id}
            name={vendor.company_name}
          />
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

function CreateVendorDialog() {
  const [open, setOpen] = useState(false)
  const createMutation = useCreateVendor()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: CreateVendorRequest = {
      company_name: formData.get('company_name') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: (formData.get('contact_phone') as string) || undefined,
      contract_number: formData.get('contract_number') as string,
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
          Add Vendor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Enter the details for the new vendor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <VendorForm />
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

function EditVendorDialog({ vendor }: { vendor: Vendor }) {
  const [open, setOpen] = useState(false)
  const updateMutation = useUpdateVendor(vendor.id)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: CreateVendorRequest = {
      company_name: formData.get('company_name') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: (formData.get('contact_phone') as string) || undefined,
      contract_number: formData.get('contract_number') as string,
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
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update the vendor's information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <VendorForm defaultValues={vendor} />
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

function DeleteVendorButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false)
  const deleteMutation = useDeleteVendor()

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
          <DialogTitle>Delete Vendor</DialogTitle>
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

function VendorForm({ defaultValues }: { defaultValues?: Partial<Vendor> }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="company_name">Company Name *</Label>
        <Input
          id="company_name"
          name="company_name"
          defaultValue={defaultValues?.company_name}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name *</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={defaultValues?.contact_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            defaultValue={defaultValues?.contact_phone || ''}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact Email *</Label>
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={defaultValues?.contact_email}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contract_number">Contract Number *</Label>
          <Input
            id="contract_number"
            name="contract_number"
            defaultValue={defaultValues?.contract_number}
            required
          />
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
      </div>
    </>
  )
}
