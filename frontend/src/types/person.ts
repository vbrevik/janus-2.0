export type ClearanceLevel = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'

// Unified Person model - can represent:
// - Users (with username/password/role)
// - Named persons (with first_name/last_name)
// - Unnamed persons (with only relations, no name)
export interface Person {
  id: number
  // Identity fields (optional - person may not have a name)
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  
  // User-specific fields (optional - only if person is a user)
  username: string | null
  password_hash: string | null // Should never be exposed to frontend, but included for completeness
  role: string | null // admin, manager, operator, viewer, enduser
  
  // Personnel-specific fields (optional - only if person has clearance info)
  clearance_level: ClearanceLevel | null
  department: string | null
  position: string | null
  
  // Common fields
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface CreatePersonRequest {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  username?: string | null
  password?: string | null
  role?: string | null
  clearance_level?: ClearanceLevel | null
  department?: string | null
  position?: string | null
}

export interface UpdatePersonRequest {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  username?: string | null
  password?: string | null
  role?: string | null
  clearance_level?: ClearanceLevel | null
  department?: string | null
  position?: string | null
}

export interface PersonListResponse {
  items: Person[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

