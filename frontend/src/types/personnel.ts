export type ClearanceLevel = 'NONE' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'

export interface Personnel {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  clearance_level: ClearanceLevel
  department: string
  position: string
  created_at: string
  updated_at: string
}

export interface CreatePersonnelRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
  clearance_level: ClearanceLevel
  department: string
  position: string
}

export interface UpdatePersonnelRequest {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  clearance_level?: ClearanceLevel
  department?: string
  position?: string
}

export interface PersonnelListResponse {
  items: Personnel[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

