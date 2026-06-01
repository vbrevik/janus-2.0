import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  PersonAccess, // Changed from PersonnelAccess
  CreateComputerAccessRequest,
  CreateDataAccessRequest,
  CreatePhysicalAccessRequest,
} from "@/types/access";
import type { ApiResponse } from "@/types/api";
import type {
  ComputerAccess,
  DataAccess,
  PhysicalAccess,
} from "@/types/access";

// Grant computer access
export function useGrantComputerAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateComputerAccessRequest) => {
      const response = await apiFetch<ApiResponse<ComputerAccess>>(
        "/api/access/computer",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person-access"] }); // Changed from personnel-access
    },
  });
}

// Grant data access
export function useGrantDataAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDataAccessRequest) => {
      const response = await apiFetch<ApiResponse<DataAccess>>(
        "/api/access/data",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person-access"] }); // Changed from personnel-access
    },
  });
}

// Grant physical access
export function useGrantPhysicalAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePhysicalAccessRequest) => {
      const response = await apiFetch<ApiResponse<PhysicalAccess>>(
        "/api/access/physical",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person-access"] }); // Changed from personnel-access
    },
  });
}

// List all access for person
export function usePersonAccess(personId: number) {
  // Changed from usePersonnelAccess and personId
  return useQuery({
    queryKey: ["person-access", personId], // Changed from personnel-access
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<PersonAccess>>(
        `/api/persons/${personId}/access`,
      ); // Changed endpoint
      return response.data;
    },
    enabled: personId > 0,
  });
}

// Revoke access
export function useRevokeAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accessType,
      accessId,
    }: {
      accessType: string;
      accessId: number;
    }) => {
      return apiFetch<{ message: string }>(
        `/api/access/${accessType}/${accessId}`,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person-access"] }); // Changed from personnel-access
    },
  });
}
