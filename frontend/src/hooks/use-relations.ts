import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { 
  RelationWithNames, 
  CreateRelationRequest, 
  UpdateRelationRequest,
  EntityHierarchy,
  EntityType 
} from '@/types/relation';
import type { ApiResponse } from '@/types/api';

// Query Keys
export const relationKeys = {
  all: ['relations'] as const,
  entity: (entityType: EntityType, entityId: number, direction?: string) => 
    [...relationKeys.all, entityType, entityId, direction || 'outgoing'] as const,
  personnel: (personnelId: number, direction?: string) => 
    relationKeys.entity('personnel', personnelId, direction),
  vendor: (vendorId: number, direction?: string) => 
    relationKeys.entity('vendor', vendorId, direction),
  hierarchy: (entityType: EntityType, entityId: number, relationType?: string) =>
    [...relationKeys.all, 'hierarchy', entityType, entityId, relationType] as const,
};

// List relations for an entity (with direction: 'outgoing', 'incoming', or 'both')
export function useRelations(
  entityType: EntityType,
  entityId: number,
  options?: { enabled?: boolean; direction?: 'outgoing' | 'incoming' | 'both' }
) {
  const direction = options?.direction || 'outgoing';
  
  return useQuery({
    queryKey: relationKeys.entity(entityType, entityId, direction),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<RelationWithNames[]>>(
        `/api/relations?entity_type=${entityType}&entity_id=${entityId}&direction=${direction}`
      );
      return response.data;
    },
    enabled: entityId > 0 && (options?.enabled !== false),
  });
}

// List personnel relations (convenience wrapper)
export function usePersonnelRelations(
  personnelId: number,
  options?: { enabled?: boolean; direction?: 'outgoing' | 'incoming' | 'both' }
) {
  return useRelations('personnel', personnelId, options);
}

// List vendor relations (convenience wrapper)
export function useVendorRelations(
  vendorId: number,
  options?: { enabled?: boolean; direction?: 'outgoing' | 'incoming' | 'both' }
) {
  return useRelations('vendor', vendorId, options);
}

// Get entity hierarchy (recursive relations)
export function useEntityHierarchy(
  entityType: EntityType,
  entityId: number,
  relationType?: string
) {
  return useQuery({
    queryKey: relationKeys.hierarchy(entityType, entityId, relationType),
    queryFn: async () => {
      const relationTypeParam = relationType ? `&relation_type=${relationType}` : '';
      const response = await apiFetch<ApiResponse<EntityHierarchy[]>>(
        `/api/relations/hierarchy?entity_type=${entityType}&entity_id=${entityId}${relationTypeParam}`
      );
      return response.data;
    },
    enabled: entityId > 0,
  });
}

// Create relation
export function useCreateRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRelationRequest) => {
      const response = await apiFetch<ApiResponse<RelationWithNames>>('/api/relations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries for both entities involved
      queryClient.invalidateQueries({ 
        queryKey: relationKeys.entity(variables.entity_type, variables.entity_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: relationKeys.entity(variables.related_entity_type, variables.related_entity_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: relationKeys.hierarchy(variables.entity_type, variables.entity_id) 
      });
    },
  });
}

// Update relation
export function useUpdateRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateRelationRequest }) => {
      const response = await apiFetch<ApiResponse<RelationWithNames>>(`/api/relations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationKeys.all });
    },
  });
}

// Delete relation
export function useDeleteRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationId: number) => {
      return await apiFetch<ApiResponse<string>>(`/api/relations/${relationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationKeys.all });
    },
  });
}

