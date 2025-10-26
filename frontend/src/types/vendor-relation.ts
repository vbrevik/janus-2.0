export type RelationType = 'sub_vendor' | 'employee' | 'consultant' | 'partner' | 'subcontractor';

export interface VendorRelation {
  id: number;
  vendor_id: number;
  related_vendor_id: number | null;
  related_personnel_id: number | null;
  relation_type: RelationType;
  notes: string | null;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorRelationRequest {
  vendor_id: number;
  relation_type: RelationType;
  related_vendor_id?: number;
  related_personnel_id?: number;
  notes?: string;
  valid_from?: string; // YYYY-MM-DD format
  valid_until?: string; // YYYY-MM-DD format
}

export interface VendorHierarchy {
  vendor_id: number;
  vendor_name: string;
  relation_type: string;
  level: number;
  sub_vendors: VendorHierarchy[];
}

