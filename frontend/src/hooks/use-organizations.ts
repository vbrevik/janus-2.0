import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Organization,
  OrganizationListResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from "@/types/organization";

// Query Keys
export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (page: number, perPage: number) =>
    [...organizationKeys.lists(), { page, perPage }] as const,
  details: () => [...organizationKeys.all, "detail"] as const,
  detail: (id: number) => [...organizationKeys.details(), id] as const,
};

// List Organizations
export function useOrganizationList(
  page = 1,
  perPage = 10,
  topLevelOnly = false,
) {
  return useQuery({
    queryKey: [...organizationKeys.list(page, perPage), topLevelOnly],
    queryFn: () =>
      api.get<OrganizationListResponse>(
        `/api/organizations?page=${page}&per_page=${perPage}${topLevelOnly ? "&top_level_only=true" : ""}`,
      ),
  });
}

// Get Single Organization
export function useOrganization(id: number) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => api.get<Organization>(`/api/organizations/${id}`),
    enabled: !!id,
  });
}

// Create Organization
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) =>
      api.post<Organization>("/api/organizations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
  });
}

// Update Organization
export function useUpdateOrganization(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationRequest) =>
      api.put<Organization>(`/api/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
    },
  });
}

// Delete Organization
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
  });
}
