export interface DocumentReference {
  id: number
  personnel_id: number
  document_type: string
  document_number: string | null
  issued_by: string | null
  issued_at: string | null
  expires_at: string | null
  attachment_path: string | null
  attachment_mime_type: string | null
  attachment_original_name: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface CreateDocumentReferenceRequest {
  personnel_id: number
  document_type: string
  document_number?: string
  issued_by?: string
  issued_at?: string
  expires_at?: string
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

