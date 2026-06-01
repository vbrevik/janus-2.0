export type ClearanceLevel =
  | "UNCLASSIFIED"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export interface Organization {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  clearance_level: ClearanceLevel;
  contract_number: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationRequest {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  clearance_level: ClearanceLevel;
  contract_number: string;
}

export interface UpdateOrganizationRequest {
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  clearance_level?: ClearanceLevel;
  contract_number?: string;
}

export interface OrganizationListResponse {
  items: Organization[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
