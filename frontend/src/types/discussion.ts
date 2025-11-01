export interface Discussion {
  id: number
  person_id: number // Changed from person_id
  subject: string // Changed from title to match backend
  message: string // Changed from content to match backend
  type: string // discussion, report, request
  status: string // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority: string // LOW, NORMAL, HIGH, URGENT
  created_by_person_id: number // Changed from created_by
  assigned_to_person_id: number | null // Changed from assigned_to
  resolved_at: string | null
  resolved_by_person_id: number | null // Changed from resolved_by
  created_at: string
  updated_at: string
}

export interface DiscussionReply {
  id: number
  discussion_id: number
  message: string
  created_by_person_id: number // Changed from created_by
  created_at: string
  updated_at: string
}

export interface DiscussionWithReplies {
  discussion: Discussion
  replies: DiscussionReply[]
}

export interface CreateDiscussionRequest {
  subject: string // Changed from title to match backend
  message: string // Changed from content to match backend
  type: string // discussion, report, request
  priority?: string // LOW, NORMAL, HIGH, URGENT (defaults to NORMAL)
  // person_id is derived from authenticated user, not required in request
}

export interface UpdateDiscussionRequest {
  title?: string
  content?: string
}

export interface CreateReplyRequest {
  message: string
}

