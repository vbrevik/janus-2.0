import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { NDA, CreateNDARequest, SignNDARequest, RejectNDARequest } from '@/types/nda';
import type { ApiResponse } from '@/types/api';

// Query Keys
export const ndaKeys = {
  all: ['nda'] as const,
  list: (filters?: { personnel_id?: number; status?: string }) => [...ndaKeys.all, 'list', filters] as const,
  detail: (id: number) => [...ndaKeys.all, id] as const,
};

// List NDAs
export function useNDAList(filters?: { personnel_id?: number; status?: string; email?: string }) {
  const params = new URLSearchParams();
  if (filters?.personnel_id) params.append('personnel_id', String(filters.personnel_id));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.email) params.append('email', filters.email);
  
  return useQuery({
    queryKey: ndaKeys.list(filters),
    queryFn: async () => {
      const queryString = params.toString();
      const url = queryString ? `/nda?${queryString}` : '/nda';
      const response = await apiFetch<ApiResponse<NDA[]>>(url);
      return response.data;
    },
    enabled: filters !== undefined && (!!filters.personnel_id || !!filters.email), // Only run if we have a valid filter
  });
}

// Get single NDA
export function useNDA(id: number) {
  return useQuery({
    queryKey: ndaKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<NDA>>(`/nda/${id}`);
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
      const response = await apiFetch<ApiResponse<NDA>>('/nda', {
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
      const response = await apiFetch<ApiResponse<NDA>>(`/nda/${id}/sign`, {
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
      const response = await apiFetch<ApiResponse<NDA> | { data: NDA }>(`/nda/${id}/reject`, {
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
      return await apiFetch<ApiResponse<string>>(`/nda/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ndaKeys.all });
    },
  });
}

