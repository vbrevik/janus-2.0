export type NDAStatus = 'PENDING' | 'ACTIVE' | 'SIGNED' | 'EXPIRED' | 'REVOKED';

export interface NDA {
  id: number;
  person_id: number; // Changed from person_id
  title: string;
  content: string;
  version: string;
  status: NDAStatus;
  issued_by_person_id: number; // Changed from issued_by
  issued_at: string;
  signed_at: string | null;
  expires_at: string | null;
  signature: string | null;
  rejection_reason?: string | null;
  sent_by_vendor_id?: number | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNDARequest {
  person_id: number; // Changed from person_id
  title: string;
  content: string;
  version?: string;
  expires_at?: string; // ISO date string YYYY-MM-DD
  sent_by_vendor_id?: number;
}

export interface SignNDARequest {
  signature: string;
}

export interface RejectNDARequest {
  reason: string;
}

