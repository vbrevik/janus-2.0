import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { 
  PersonnelAccess,
  CreateComputerAccessRequest,
  CreateDataAccessRequest,
  CreatePhysicalAccessRequest,
} from '@/types/access';
import type { ApiResponse } from '@/types/api';
import type { ComputerAccess, DataAccess, PhysicalAccess } from '@/types/access';

// Grant computer access
export function useGrantComputerAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateComputerAccessRequest) => {
      const response = await apiFetch<ApiResponse<ComputerAccess>>('/access/computer', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-access'] });
    },
  });
}

// Grant data access
export function useGrantDataAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateDataAccessRequest) => {
      const response = await apiFetch<ApiResponse<DataAccess>>('/access/data', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-access'] });
    },
  });
}

// Grant physical access
export function useGrantPhysicalAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePhysicalAccessRequest) => {
      const response = await apiFetch<ApiResponse<PhysicalAccess>>('/access/physical', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-access'] });
    },
  });
}

// List all access for personnel
export function usePersonnelAccess(personnelId: number) {
  return useQuery({
    queryKey: ['personnel-access', personnelId],
    queryFn: async () => {
      return apiFetch<PersonnelAccess>(`/personnel/${personnelId}/access`);
    },
    enabled: personnelId > 0,
  });
}

// Revoke access
export function useRevokeAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ accessType, accessId }: { accessType: string; accessId: number }) => {
      return apiFetch<{ message: string }>(`/access/${accessType}/${accessId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-access'] });
    },
  });
}

