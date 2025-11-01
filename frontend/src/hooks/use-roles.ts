import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  SetRolePermissionsRequest,
} from '@/types/roles'

// Query Keys
export const rolesKeys = {
  all: ['roles'] as const,
  lists: () => [...rolesKeys.all, 'list'] as const,
  list: () => [...rolesKeys.lists()] as const,
  details: () => [...rolesKeys.all, 'detail'] as const,
  detail: (id: number) => [...rolesKeys.details(), id] as const,
  permissions: () => [...rolesKeys.all, 'permissions'] as const,
  rolePermissions: (id: number) => [...rolesKeys.all, 'permissions', id] as const,
}

// List Roles
export function useRolesList() {
  return useQuery({
    queryKey: rolesKeys.list(),
    queryFn: () => api.get<Role[]>('/roles'),
  })
}

// List Permissions
export function usePermissionsList() {
  return useQuery({
    queryKey: rolesKeys.permissions(),
    queryFn: () => api.get<Permission[]>('/roles/permissions'),
  })
}

// Get Role Permissions
export function useRolePermissions(roleId: number) {
  return useQuery({
    queryKey: rolesKeys.rolePermissions(roleId),
    queryFn: () => api.get<string[]>(`/roles/${roleId}/permissions`),
    enabled: !!roleId && roleId > 0,
  })
}

// Create Role
export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRoleRequest) =>
      api.post<Role>('/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}

// Update Role
export function useUpdateRole(roleId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateRoleRequest) =>
      api.put<Role>(`/roles/${roleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: rolesKeys.detail(roleId) })
    },
  })
}

// Delete Role
export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}

// Set Role Permissions
export function useSetRolePermissions(roleId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SetRolePermissionsRequest) =>
      api.put(`/roles/${roleId}/permissions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.rolePermissions(roleId) })
      queryClient.invalidateQueries({ queryKey: rolesKeys.detail(roleId) })
    },
  })
}
