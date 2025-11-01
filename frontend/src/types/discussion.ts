export interface Discussion {
  id: number
  personnel_id: number
  title: string
  content: string
  created_by: number
  created_at: string
  updated_at: string
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

