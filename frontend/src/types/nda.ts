export type NDAStatus = 'PENDING' | 'ACTIVE' | 'SIGNED' | 'EXPIRED' | 'REVOKED';

export interface NDA {
  id: number;
  personnel_id: number;
  title: string;
  content: string;
  version: string;
  status: NDAStatus;
  issued_by: number;
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
  personnel_id: number;
  title: string;
  content: string;
  version?: string;
  expires_at?: string;
  sent_by_vendor_id?: number;
}

export interface SignNDARequest {
  signature: string;
}

export interface RejectNDARequest {
  reason: string;
}

