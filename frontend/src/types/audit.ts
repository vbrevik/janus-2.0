export interface AuditLog {
  id: number
  user_id: number | null
  username: string
  action: string
  resource_type: string
  resource_id: number | null
  details: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}


