import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Vendor,
  VendorListResponse,
  CreateVendorRequest,
  UpdateVendorRequest,
} from '@/types/vendor'

// Query Keys
export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (page: number, perPage: number) =>
    [...vendorKeys.lists(), { page, perPage }] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: number) => [...vendorKeys.details(), id] as const,
}

// List Vendors
export function useVendorList(page = 1, perPage = 10) {
  return useQuery({
    queryKey: vendorKeys.list(page, perPage),
    queryFn: () =>
      api.get<VendorListResponse>(
        `/vendors?page=${page}&per_page=${perPage}`
      ),
  })
}

// Get Single Vendor
export function useVendor(id: number) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => api.get<Vendor>(`/vendors/${id}`),
    enabled: !!id,
  })
}

// Create Vendor
export function useCreateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVendorRequest) =>
      api.post<Vendor>('/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    },
  })
}

// Update Vendor
export function useUpdateVendor(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateVendorRequest) =>
      api.put<Vendor>(`/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(id) })
    },
  })
}

// Delete Vendor
export function useDeleteVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    },
  })
}

