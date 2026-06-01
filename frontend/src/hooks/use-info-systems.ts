// Information Systems React Query hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  InfoSystem,
  CreateInfoSystemRequest,
  UpdateInfoSystemRequest,
} from "@/types/info-system";
import type { PaginatedResponse } from "@/types/api";

export function useInfoSystemsList(page: number = 1, perPage: number = 20) {
  return useQuery({
    queryKey: ["info-systems", page, perPage],
    queryFn: async () => {
      return apiFetch<PaginatedResponse<InfoSystem>>(
        `/api/info-systems?page=${page}&per_page=${perPage}`,
      );
    },
  });
}

export function useInfoSystemDetail(id: number) {
  return useQuery({
    queryKey: ["info-system", id],
    queryFn: async () => {
      return apiFetch<InfoSystem>(`/api/info-systems/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateInfoSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInfoSystemRequest) => {
      return apiFetch<InfoSystem>("/api/info-systems", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["info-systems"] });
    },
  });
}

export function useUpdateInfoSystem(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateInfoSystemRequest) => {
      return apiFetch<InfoSystem>(`/api/info-systems/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["info-systems"] });
      queryClient.invalidateQueries({ queryKey: ["info-system", id] });
    },
  });
}

export function useDeleteInfoSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/api/info-systems/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["info-systems"] });
    },
  });
}
