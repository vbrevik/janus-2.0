import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/types/api'
import type { AuditLog } from '@/types/audit'

export interface AuditQueryParams {
  page?: number
  per_page?: number
  username?: string
  action?: string
  resource_type?: string
}

export function useAuditLogs(params: AuditQueryParams) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.username) qs.set('username', params.username)
  if (params.action) qs.set('action', params.action)
  if (params.resource_type) qs.set('resource_type', params.resource_type)

  return useQuery({
    queryKey: ['audit', qs.toString()],
    queryFn: () => api.get<PaginatedResponse<AuditLog>>(`/audit?${qs.toString()}`),
  })
}

export function useAuditLog(id?: number) {
  return useQuery({
    queryKey: ['audit', id],
    queryFn: () => api.get<AuditLog>(`/audit/${id}`),
    enabled: !!id,
  })
}


