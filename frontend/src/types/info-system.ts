// Information Systems type definitions

export type Environment = 'DEV' | 'TEST' | 'PROD'
export type SystemStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface InfoSystem {
  id: number
  system_name: string
  description: string | null
  environment: Environment
  status: SystemStatus
  ip_address: string | null
  domain: string | null
  managed_by: string | null
  last_audit_date: string | null
  created_at: string
  updated_at: string
}

export interface CreateInfoSystemRequest {
  system_name: string
  description?: string | null
  environment: Environment
  status: SystemStatus
  ip_address?: string | null
  domain?: string | null
  managed_by?: string | null
  last_audit_date?: string | null
}

export interface UpdateInfoSystemRequest {
  system_name?: string
  description?: string | null
  environment?: Environment
  status?: SystemStatus
  ip_address?: string | null
  domain?: string | null
  managed_by?: string | null
  last_audit_date?: string | null
}

