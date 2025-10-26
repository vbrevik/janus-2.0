import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Personnel,
  PersonnelListResponse,
  CreatePersonnelRequest,
  UpdatePersonnelRequest,
} from '@/types/personnel'

// Query Keys
export const personnelKeys = {
  all: ['personnel'] as const,
  lists: () => [...personnelKeys.all, 'list'] as const,
  list: (page: number, perPage: number) =>
    [...personnelKeys.lists(), { page, perPage }] as const,
  details: () => [...personnelKeys.all, 'detail'] as const,
  detail: (id: number) => [...personnelKeys.details(), id] as const,
}

// List Personnel
export function usePersonnelList(page = 1, perPage = 10) {
  return useQuery({
    queryKey: personnelKeys.list(page, perPage),
    queryFn: () =>
      api.get<PersonnelListResponse>(
        `/personnel?page=${page}&per_page=${perPage}`
      ),
  })
}

// Get Single Personnel
export function usePersonnel(id: number) {
  return useQuery({
    queryKey: personnelKeys.detail(id),
    queryFn: () => api.get<Personnel>(`/personnel/${id}`),
    enabled: !!id,
  })
}

// Create Personnel
export function useCreatePersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePersonnelRequest) =>
      api.post<Personnel>('/personnel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personnelKeys.lists() })
    },
  })
}

// Update Personnel
export function useUpdatePersonnel(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdatePersonnelRequest) =>
      api.put<Personnel>(`/personnel/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personnelKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personnelKeys.detail(id) })
    },
  })
}

// Delete Personnel
export function useDeletePersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/personnel/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personnelKeys.lists() })
    },
  })
}

