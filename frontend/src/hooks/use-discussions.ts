import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Discussion, DiscussionWithReplies, CreateDiscussionRequest, CreateReplyRequest } from '@/types/discussion';
import type { ApiResponse } from '@/types/api';

// Query Keys
export const discussionKeys = {
  all: ['discussions'] as const,
  list: (filters?: { personnel_id?: number; status?: string; type?: string }) => [...discussionKeys.all, 'list', filters] as const,
  detail: (id: number) => [...discussionKeys.all, id] as const,
};

// List discussions
export function useDiscussionsList(filters?: { personnel_id?: number; status?: string; type?: string }) {
  const params = new URLSearchParams();
  if (filters?.personnel_id) params.append('personnel_id', String(filters.personnel_id));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);
  
  return useQuery({
    queryKey: discussionKeys.list(filters),
    queryFn: async () => {
      const queryString = params.toString();
      const url = queryString ? `/discussions?${queryString}` : '/discussions';
      const response = await apiFetch<ApiResponse<Discussion[]>>(url);
      return response.data;
    },
    enabled: filters !== undefined && !!filters.personnel_id,
  });
}

// Get single discussion with replies
export function useDiscussion(id: number) {
  return useQuery({
    queryKey: discussionKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DiscussionWithReplies>>(`/discussions/${id}`);
      return response.data;
    },
    enabled: id > 0,
  });
}

// Create discussion
export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDiscussionRequest) => {
      const response = await apiFetch<ApiResponse<Discussion>>('/discussions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.all });
    },
  });
}

// Create reply
export function useCreateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateReplyRequest }) => {
      const response = await apiFetch<ApiResponse<Discussion>>(`/discussions/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: discussionKeys.all });
    },
  });
}

