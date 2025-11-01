import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { NDA, CreateNDARequest, SignNDARequest, RejectNDARequest } from '@/types/nda';
import type { ApiResponse } from '@/types/api';

// Query Keys
export const ndaKeys = {
  all: ['nda'] as const,
  list: (filters?: { person_id?: number; status?: string; email?: string }) => [...ndaKeys.all, 'list', filters] as const,
  detail: (id: number) => [...ndaKeys.all, id] as const,
};

// List NDAs
export function useNDAList(filters?: { person_id?: number; status?: string; email?: string }) {
  const params = new URLSearchParams();
  if (filters?.person_id) params.append('person_id', String(filters.person_id)); // Changed from person_id
  if (filters?.status) params.append('status', filters.status);
  if (filters?.email) params.append('email', filters.email);
  
  return useQuery({
    queryKey: ndaKeys.list(filters),
    queryFn: async () => {
      const queryString = params.toString();
      const url = queryString ? `/api/nda?${queryString}` : '/api/nda';
      const response = await apiFetch<NDA[] | ApiResponse<NDA[]>>(url);
      // Handle both array and ApiResponse formats
      if (Array.isArray(response)) {
        return response;
      }
      return (response as ApiResponse<NDA[]>).data || [];
    },
    enabled: filters === undefined || !!filters.person_id || !!filters.email, // Changed from person_id
  });
}

// Get single NDA
export function useNDA(id: number) {
  return useQuery({
    queryKey: ndaKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<NDA>>(`/api/nda/${id}`);
      return response.data;
    },
    enabled: id > 0,
  });
}

// Create NDA
export function useCreateNDA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNDARequest) => {
      const response = await apiFetch<ApiResponse<NDA>>('/api/nda', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ndaKeys.all });
    },
  });
}

// Sign NDA
export function useSignNDA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SignNDARequest }) => {
      const response = await apiFetch<ApiResponse<NDA>>(`/api/nda/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ndaKeys.all });
    },
  });
}

// Reject NDA
export function useRejectNDA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RejectNDARequest }) => {
      // Handle both response formats for compatibility
      const response = await apiFetch<ApiResponse<NDA> | { data: NDA }>(`/api/nda/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      // Normalize response format
      if ('data' in response && !('success' in response)) {
        return response.data;
      }
      return (response as ApiResponse<NDA>).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ndaKeys.all });
    },
  });
}

// Delete/Revoke NDA
export function useDeleteNDA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await apiFetch<ApiResponse<string>>(`/api/nda/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ndaKeys.all });
    },
  });
}

