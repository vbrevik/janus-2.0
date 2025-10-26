import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { 
  PersonnelAccess,
  CreateComputerAccessRequest,
  CreateDataAccessRequest,
  CreatePhysicalAccessRequest,
} from '@/types/access';

// Grant computer access
export function useGrantComputerAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateComputerAccessRequest) => {
      return apiFetch<{ id: number }>('/api/access/computer', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
      return apiFetch<{ id: number }>('/api/access/data', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
      return apiFetch<{ id: number }>('/api/access/physical', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
      return apiFetch<PersonnelAccess>(`/api/personnel/${personnelId}/access`);
    },
    enabled: personnelId > 0,
  });
}

// Revoke access
export function useRevokeAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ accessType, accessId }: { accessType: string; accessId: number }) => {
      return apiFetch<{ message: string }>(`/api/access/${accessType}/${accessId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-access'] });
    },
  });
}

