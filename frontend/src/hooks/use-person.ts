import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Person,
  PersonListResponse,
  CreatePersonRequest,
  UpdatePersonRequest,
} from '@/types/person'

// Query Keys
export const personKeys = {
  all: ['persons'] as const, // Changed from personnel
  lists: () => [...personKeys.all, 'list'] as const,
  list: (page: number, perPage: number) =>
    [...personKeys.lists(), { page, perPage }] as const,
  details: () => [...personKeys.all, 'detail'] as const,
  detail: (id: number) => [...personKeys.details(), id] as const,
}

// List Persons
export function usePersonList(page = 1, perPage = 10) {
  return useQuery({
    queryKey: personKeys.list(page, perPage),
    queryFn: () =>
      api.get<PersonListResponse>(
        `/api/person?page=${page}&per_page=${perPage}` // Backend uses /api/person (singular)
      ),
  })
}

// Get Single Person
export function usePerson(id: number) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: () => api.get<Person>(`/api/person/${id}`), // Backend uses /api/person (singular)
    enabled: !!id,
  })
}

// Create Person
export function useCreatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePersonRequest) =>
      api.post<Person>('/api/person', data), // Backend uses singular path
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
    },
  })
}

// Update Person
export function useUpdatePerson(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdatePersonRequest) =>
      api.put<Person>(`/api/person/${id}`, data), // Backend uses singular path
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
      queryClient.invalidateQueries({ queryKey: personKeys.detail(id) })
    },
  })
}

// Delete Person
export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/person/${id}`), // Backend uses singular path
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
    },
  })
}

