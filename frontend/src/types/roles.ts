export interface Role {
  id: number
  name: string
  description: string | null
  created_at: string
}

export interface Permission {
  id: number
  key: string
  description: string | null
}

export interface CreateRoleRequest {
  name: string
  description?: string | null
}

export interface UpdateRoleRequest {
  name?: string | null
  description?: string | null
}

export interface SetRolePermissionsRequest {
  permissions: string[]
}
