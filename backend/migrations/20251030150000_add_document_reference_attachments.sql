-- Add attachment fields to document_references
ALTER TABLE document_references
  ADD COLUMN IF NOT EXISTS attachment_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS attachment_mime_type VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS attachment_original_name VARCHAR(255) NULL;

COMMENT ON COLUMN document_references.attachment_path IS 'Filesystem path to uploaded attachment (PDF/image)';
COMMENT ON COLUMN document_references.attachment_mime_type IS 'MIME type for the attachment (e.g., application/pdf)';
COMMENT ON COLUMN document_references.attachment_original_name IS 'Original filename uploaded by the user';


