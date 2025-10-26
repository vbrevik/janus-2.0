export type ClearanceLevel = 'NONE' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'

export interface Vendor {
  id: number
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  clearance_level: ClearanceLevel
  contract_number: string
  created_at: string
  updated_at: string
}

export interface CreateVendorRequest {
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  clearance_level: ClearanceLevel
  contract_number: string
}

export interface UpdateVendorRequest {
  company_name?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  clearance_level?: ClearanceLevel
  contract_number?: string
}

export interface VendorListResponse {
  items: Vendor[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

