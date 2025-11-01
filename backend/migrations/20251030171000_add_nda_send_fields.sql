-- Track who (vendor unit) sent an NDA for signing and when it was sent
ALTER TABLE nda
ADD COLUMN IF NOT EXISTS sent_by_vendor_id INTEGER REFERENCES vendors(id),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

COMMENT ON COLUMN nda.sent_by_vendor_id IS 'Vendor (unit) that sent the NDA to the end user';
COMMENT ON COLUMN nda.sent_at IS 'Timestamp when the NDA was sent to the end user for signing';


