export interface Discussion {
  id: number
  personnel_id: number
  title: string
  content: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface DiscussionReply {
  id: number
  discussion_id: number
  message: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface DiscussionWithReplies extends Discussion {
  replies: DiscussionReply[]
}

export interface CreateDiscussionRequest {
  personnel_id: number
  title: string
  content: string
}

export interface UpdateDiscussionRequest {
  title?: string
  content?: string
}

export interface CreateReplyRequest {
  message: string
}

