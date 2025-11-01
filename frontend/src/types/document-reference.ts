export interface DocumentReference {
  id: number
  person_id: number // Changed from person_id
  document_type: string
  document_number: string | null
  issued_by: string | null
  issued_at: string | null
  expires_at: string | null
  attachment_path: string | null
  attachment_mime_type: string | null
  attachment_original_name: string | null
  rejection_reason: string | null
  // Fields from enduser-frontend version (alternative structure)
  title?: string
  description?: string | null
  location?: string | null
  issued_date?: string | null // ISO date string
  self_reported_by_person_id?: number // Changed from self_reported_by
  self_reported_at?: string
  verified_by_person_id?: number | null // Changed from verified_by
  verified_at?: string | null
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED'
  notes?: string | null
  // Common fields
  created_at: string
  updated_at: string
}

export interface CreateDocumentReferenceRequest {
  title: string
  document_type?: string // Defaults to 'security_brief'
  description?: string | null
  issued_date?: string | null // ISO date string YYYY-MM-DD
  location?: string | null
  notes?: string | null
  // person_id is derived from authenticated user, not required in request
}

export interface UpdateDocumentReferenceRequest {
  document_type?: string
  document_number?: string
  issued_by?: string
  issued_at?: string
  expires_at?: string
}

export interface AttachmentUploadRequest {
  file_data: string // base64 encoded
  mime_type: string
  original_name: string
}

