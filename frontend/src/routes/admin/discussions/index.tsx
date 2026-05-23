import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
// Using native textarea element
import { MessageSquare, Plus, Eye } from 'lucide-react'
import {
  useDiscussionsList,
  useDiscussion,
  useCreateDiscussion,
  useCreateReply,
} from '@/hooks/use-discussions'
import { usePersonList } from '@/hooks/use-person'
import type { Discussion, CreateDiscussionRequest } from '@/types/discussion'

export const Route = createFileRoute('/admin/discussions/')({
  component: DiscussionsList,
})

function DiscussionsList() {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDiscussion, setSelectedDiscussion] = useState<number | null>(null)
  const [personFilter, setPersonFilter] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useDiscussionsList({
    person_id: personFilter,
    status: statusFilter || undefined,
  })

  const { data: persons } = usePersonList(1, 100)

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Discussions</h1>
                <p className="text-muted-foreground mt-1">
                  Manage discussions, reports, and requests
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Discussion
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filter by Person</Label>
              <Select
                value={personFilter?.toString() || ''}
                onValueChange={(v) => setPersonFilter(v ? parseInt(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All persons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All persons</SelectItem>
                  {persons?.items.map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.first_name} {person.last_name} ({person.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(personFilter || statusFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setPersonFilter(undefined)
                  setStatusFilter('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading discussions: {error.message}
            </div>
          )}

          {data && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Person</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No discussions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((discussion) => (
                        <DiscussionRow
                          key={discussion.id}
                          discussion={discussion}
                          onView={() => setSelectedDiscussion(discussion.id)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Create Dialog */}
          {showCreate && (
            <CreateDiscussionDialog
              open={showCreate}
              onClose={() => setShowCreate(false)}
            />
          )}

          {/* View/Reply Dialog */}
          {selectedDiscussion && (
            <ViewDiscussionDialog
              discussionId={selectedDiscussion}
              open={!!selectedDiscussion}
              onClose={() => setSelectedDiscussion(null)}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function DiscussionRow({
  discussion,
  onView,
}: {
  discussion: Discussion
  onView: () => void
}) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'default'
      case 'IN_PROGRESS':
        return 'warning'
      case 'RESOLVED':
        return 'secondary'
      case 'CLOSED':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive'
      case 'HIGH':
        return 'warning'
      case 'NORMAL':
        return 'default'
      case 'LOW':
        return 'secondary'
      default:
        return 'default'
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{discussion.subject}</TableCell>
      <TableCell>
        <Badge variant="outline">{discussion.type}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(discussion.status)}>
          {discussion.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getPriorityBadgeVariant(discussion.priority)}>
          {discussion.priority}
        </Badge>
      </TableCell>
      <TableCell>Person #{discussion.person_id}</TableCell>
      <TableCell>{new Date(discussion.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onView}>
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function CreateDiscussionDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const createMutation = useCreateDiscussion()
  const [form, setForm] = useState<CreateDiscussionRequest>({
    subject: '',
    message: '',
    type: 'discussion',
    priority: 'NORMAL',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync(form)
      setForm({ subject: '', message: '', type: 'discussion', priority: 'NORMAL' })
      onClose()
    } catch (error) {
      console.error('Failed to create discussion:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Discussion</DialogTitle>
          <DialogDescription>
            Create a new discussion, report, or request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="request">Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.priority || 'NORMAL'}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Discussion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ViewDiscussionDialog({
  discussionId,
  open,
  onClose,
}: {
  discussionId: number
  open: boolean
  onClose: () => void
}) {
  const { data: discussionData } = useDiscussion(discussionId)
  const createReplyMutation = useCreateReply()
  const [replyText, setReplyText] = useState('')

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim()) return

    try {
      await createReplyMutation.mutateAsync({
        id: discussionId,
        data: { message: replyText },
      })
      setReplyText('')
    } catch (error) {
      console.error('Failed to add reply:', error)
    }
  }

  if (!discussionData) return null

  const { discussion, replies } = discussionData

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{discussion.subject}</DialogTitle>
          <DialogDescription>
            Discussion ID: {discussion.id} | Created: {new Date(discussion.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Discussion Details */}
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex gap-2">
              <Badge>{discussion.type}</Badge>
              <Badge>{discussion.status}</Badge>
              <Badge>{discussion.priority}</Badge>
            </div>
            <p className="whitespace-pre-wrap">{discussion.message}</p>
          </div>

          {/* Replies */}
          <div className="space-y-4">
            <h3 className="font-semibold">Replies ({replies.length})</h3>
            {replies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No replies yet.</p>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Person #{reply.created_by_person_id}</span>
                    <span>{new Date(reply.created_at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleReply} className="space-y-2">
            <Label htmlFor="reply">Add Reply</Label>
            <textarea
              id="reply"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Type your reply here..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button type="submit" disabled={createReplyMutation.isPending || !replyText.trim()}>
              {createReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

