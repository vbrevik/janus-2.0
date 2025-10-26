import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
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
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [showCreate, setShowCreate] = useState(false)
  const perPage = 10

  const { data, isLoading, error } = useVendorList(page, perPage)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Vendor Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage vendors and their security clearances
              </p>
            </div>
            <Button onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" />
              {showCreate ? 'Hide New Row' : 'Add Vendor'}
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
                      <TableHead>Phone</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Clearance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showCreate && <CreateVendorRow onDone={() => setShowCreate(false)} />}
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
  const [editing, setEditing] = useState(false)
  const updateMutation = useUpdateVendor(vendor.id)
  const deleteMutation = useDeleteVendor()

  const [form, setForm] = useState({
    company_name: vendor.company_name,
    contact_name: vendor.contact_name,
    contact_email: vendor.contact_email,
    contact_phone: vendor.contact_phone || '',
    contract_number: vendor.contract_number,
    clearance_level: vendor.clearance_level as ClearanceLevel,
  })

  const onSave = async () => {
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

  const onDelete = async () => {
    await deleteMutation.mutateAsync(vendor.id)
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {editing ? (
          <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        ) : (
          vendor.company_name
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        ) : (
          vendor.contact_name
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        ) : (
          vendor.contact_email
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        ) : (
          vendor.contact_phone || '-'
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
        ) : (
          vendor.contract_number
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Select value={form.clearance_level} onValueChange={(v) => setForm({ ...form, clearance_level: v as ClearanceLevel })}>
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
          <ClearanceBadge level={vendor.clearance_level} />
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

function ClearanceBadge({ level }: { level: ClearanceLevel }) {
  const variants: Record<ClearanceLevel, 'default' | 'secondary' | 'warning' | 'destructive'> = {
    NONE: 'secondary',
    CONFIDENTIAL: 'default',
    SECRET: 'warning',
    TOP_SECRET: 'destructive',
  }

  return <Badge variant={variants[level]}>{level}</Badge>
}

function CreateVendorRow({ onDone }: { onDone: () => void }) {
  const createMutation = useCreateVendor()
  const [form, setForm] = useState<CreateVendorRequest>({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contract_number: '',
    clearance_level: 'NONE' as ClearanceLevel,
  })

  const onCreate = async () => {
    await createMutation.mutateAsync({
      ...form,
      contact_phone: form.contact_phone || undefined,
    })
    onDone()
  }

  return (
    <TableRow className="bg-accent/30">
      <TableCell className="font-medium">
        <Input placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="Contact name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input type="email" placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input type="tel" placeholder="Phone (optional)" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input placeholder="Contract #" value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
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

// Inline editing replaces EditVendorDialog

// Delete handled inline in VendorRow

// Removed old modal form; inline fields are used instead
