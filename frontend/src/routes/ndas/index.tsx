import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Plus, Eye, Check, X, Ban } from 'lucide-react'
import {
  useNDAList,
  useCreateNDA,
  useDeleteNDA,
  useNDA,
} from '@/hooks/use-nda'
import { usePersonnelList } from '@/hooks/use-personnel'
import type { NDA, NDAStatus, CreateNDARequest } from '@/types/nda'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/ndas/')({
  component: NDAManagement,
})

function NDAManagement() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  // Query all NDAs (no filter to get all)
  const { data: ndas, isLoading, error, refetch } = useNDAList(
    statusFilter ? { status: statusFilter } : undefined
  )

  // Filter NDAs by status if filter is set
  const filteredNDAs = statusFilter
    ? (ndas || []).filter((nda) => nda.status === statusFilter)
    : ndas || []

  const getStatusBadge = (status: NDAStatus) => {
    const variants: Record<NDAStatus, 'default' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
      PENDING: 'warning',
      ACTIVE: 'default',
      SIGNED: 'success' as any,
      EXPIRED: 'secondary',
      REVOKED: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">NDA Management</h1>
                <p className="text-muted-foreground mt-1">
                  Manage Non-Disclosure Agreements
                </p>
              </div>
            </div>
            <CreateNDADialog open={showCreate} onOpenChange={setShowCreate} onSuccess={() => refetch()} />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Filter by Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SIGNED">Signed</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="REVOKED">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setStatusFilter('')}
              disabled={!statusFilter}
            >
              Clear Filter
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading NDAs: {error.message}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* NDAs Table */}
          {ndas && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Personnel ID</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Signed</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNDAs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {statusFilter ? `No NDAs with status "${statusFilter}"` : 'No NDAs found. Create your first NDA!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNDAs.map((nda) => (
                      <NDARow key={nda.id} nda={nda} onDeleted={() => refetch()} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function NDARow({ nda, onDeleted }: { nda: NDA; onDeleted: () => void }) {
  const [showDetail, setShowDetail] = useState(false)
  const deleteNDA = useDeleteNDA()

  const getStatusBadge = (status: NDAStatus) => {
    const variants: Record<NDAStatus, 'default' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
      PENDING: 'warning',
      ACTIVE: 'default',
      SIGNED: 'success' as any,
      EXPIRED: 'secondary',
      REVOKED: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to revoke NDA "${nda.title}"?`)) {
      try {
        await deleteNDA.mutateAsync(nda.id)
        onDeleted()
      } catch (error) {
        console.error('Error deleting NDA:', error)
        alert('Failed to delete NDA')
      }
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{nda.title}</TableCell>
      <TableCell>{nda.version}</TableCell>
      <TableCell>{getStatusBadge(nda.status)}</TableCell>
      <TableCell>
        <Link
          to="/personnel/$personnelId"
          params={{ personnelId: String(nda.personnel_id) }}
          className="text-primary hover:underline"
        >
          {nda.personnel_id}
        </Link>
      </TableCell>
      <TableCell>{formatDate(nda.issued_at)}</TableCell>
      <TableCell>{nda.signed_at ? formatDate(nda.signed_at) : 'Not signed'}</TableCell>
      <TableCell>{nda.expires_at ? formatDate(nda.expires_at) : 'No expiry'}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetail(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteNDA.isPending}
          >
            <Ban className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
      {showDetail && (
        <NDADetailDialog ndaId={nda.id} open={showDetail} onOpenChange={setShowDetail} />
      )}
    </TableRow>
  )
}

function NDADetailDialog({
  ndaId,
  open,
  onOpenChange,
}: {
  ndaId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: nda, isLoading } = useNDA(ndaId)

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nda?.title || 'NDA Details'}</DialogTitle>
          <DialogDescription>
            View complete NDA information
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : nda ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Version</Label>
                <p className="font-medium">{nda.version}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="font-medium">{nda.status}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Personnel ID</Label>
                <p className="font-medium">
                  <Link
                    to="/personnel/$personnelId"
                    params={{ personnelId: String(nda.personnel_id) }}
                    className="text-primary hover:underline"
                  >
                    {nda.personnel_id}
                  </Link>
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Issued At</Label>
                <p className="font-medium">{formatDate(nda.issued_at)}</p>
              </div>
              {nda.signed_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Signed At</Label>
                  <p className="font-medium">{formatDate(nda.signed_at)}</p>
                </div>
              )}
              {nda.expires_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Expires At</Label>
                  <p className="font-medium">{formatDate(nda.expires_at)}</p>
                </div>
              )}
              {nda.sent_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Sent At</Label>
                  <p className="font-medium">{formatDate(nda.sent_at)}</p>
                </div>
              )}
            </div>
            {nda.rejection_reason && (
              <div>
                <Label className="text-xs text-muted-foreground">Rejection Reason</Label>
                <p className="font-medium text-destructive">{nda.rejection_reason}</p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Content</Label>
              <pre className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {nda.content}
              </pre>
            </div>
            {nda.signature && (
              <div>
                <Label className="text-xs text-muted-foreground">Signature</Label>
                <p className="font-mono text-sm">{nda.signature}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">NDA not found</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateNDADialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<CreateNDARequest>({
    personnel_id: 0,
    title: '',
    content: '',
    version: undefined,
    expires_at: undefined,
    sent_by_vendor_id: undefined,
  })
  const createNDA = useCreateNDA()
  const { data: personnelData } = usePersonnelList(1, 1000) // Get all personnel for dropdown

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.content || !formData.personnel_id) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await createNDA.mutateAsync(formData)
      setFormData({
        personnel_id: 0,
        title: '',
        content: '',
        version: undefined,
        expires_at: undefined,
        sent_by_vendor_id: undefined,
      })
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error creating NDA:', error)
      alert(`Error creating NDA: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create NDA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New NDA</DialogTitle>
          <DialogDescription>
            Send a new Non-Disclosure Agreement to personnel
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nda-personnel">Personnel *</Label>
            <Select
              value={formData.personnel_id ? String(formData.personnel_id) : ''}
              onValueChange={(value) =>
                setFormData({ ...formData, personnel_id: parseInt(value) })
              }
            >
              <SelectTrigger id="nda-personnel">
                <SelectValue placeholder="Select personnel" />
              </SelectTrigger>
              <SelectContent>
                {personnelData?.items.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.first_name} {p.last_name} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nda-title">Title *</Label>
            <Input
              id="nda-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Standard NDA 2025"
              required
            />
          </div>
          <div>
            <Label htmlFor="nda-version">Version</Label>
            <Input
              id="nda-version"
              value={formData.version || ''}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value || undefined })
              }
              placeholder="e.g., 1.0"
            />
          </div>
          <div>
            <Label htmlFor="nda-expires">Expires At</Label>
            <Input
              id="nda-expires"
              type="date"
              value={formData.expires_at || ''}
              onChange={(e) =>
                setFormData({ ...formData, expires_at: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <Label htmlFor="nda-content">Content *</Label>
            <textarea
              id="nda-content"
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter NDA content..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createNDA.isPending}>
              {createNDA.isPending ? 'Creating...' : 'Create NDA'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

