import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { VendorRelation, CreateVendorRelationRequest, VendorHierarchy } from '@/types/vendor-relation';
import type { ApiResponse } from '@/types/api';

// Query Keys
export const vendorRelationKeys = {
  all: ['vendor-relations'] as const,
  vendor: (vendorId: number) => [...vendorRelationKeys.all, vendorId] as const,
  hierarchy: (vendorId: number) => [...vendorRelationKeys.all, 'hierarchy', vendorId] as const,
};

// List vendor relations
export function useVendorRelations(vendorId: number) {
  return useQuery({
    queryKey: vendorRelationKeys.vendor(vendorId),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<VendorRelation[]>>(
        `/vendors/${vendorId}/relations`
      );
      return response.data;
    },
    enabled: vendorId > 0,
  });
}

// Get vendor hierarchy
export function useVendorHierarchy(vendorId: number) {
  return useQuery({
    queryKey: vendorRelationKeys.hierarchy(vendorId),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<VendorHierarchy[]>>(
        `/vendors/${vendorId}/hierarchy`
      );
      return response.data;
    },
    enabled: vendorId > 0,
  });
}

// Create vendor relation
export function useCreateVendorRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVendorRelationRequest) => {
      const response = await apiFetch<ApiResponse<VendorRelation>>('/vendors/relations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorRelationKeys.vendor(variables.vendor_id) });
      queryClient.invalidateQueries({ queryKey: vendorRelationKeys.hierarchy(variables.vendor_id) });
    },
  });
}

// Delete vendor relation
export function useDeleteVendorRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationId: number) => {
      return await apiFetch<ApiResponse<string>>(`/vendors/relations/${relationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Note: You'll need to pass vendorId when calling this hook
      queryClient.invalidateQueries({ queryKey: ['vendor-relations'] });
    },
  });
}

