-- Add rejection_reason to NDA for recording user-provided reason upon rejection
ALTER TABLE nda
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN nda.rejection_reason IS 'Optional reason provided by the end user when rejecting the NDA';


