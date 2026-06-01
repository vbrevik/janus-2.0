import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Person,
  PersonListResponse,
  CreatePersonRequest,
  UpdatePersonRequest,
} from "@/types/person";

// Query Keys
export const personKeys = {
  all: ["persons"] as const, // Changed from personnel
  lists: () => [...personKeys.all, "list"] as const,
  list: (page: number, perPage: number, search = "") =>
    [...personKeys.lists(), { page, perPage, search }] as const,
  details: () => [...personKeys.all, "detail"] as const,
  detail: (id: number) => [...personKeys.details(), id] as const,
};

// List Persons (optional case-insensitive search across name/email/username)
export function usePersonList(page = 1, perPage = 10, search = "") {
  return useQuery({
    queryKey: personKeys.list(page, perPage, search),
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search.trim()) qs.set("search", search.trim());
      // Backend uses /api/person (singular)
      return api.get<PersonListResponse>(`/api/person?${qs.toString()}`);
    },
  });
}

// Get Single Person
export function usePerson(id: number) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: () => api.get<Person>(`/api/person/${id}`), // Backend uses /api/person (singular)
    enabled: !!id,
  });
}

// Create Person
export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePersonRequest) =>
      api.post<Person>("/api/person", data), // Backend uses singular path
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
    },
  });
}

// Update Person
export function useUpdatePerson(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePersonRequest) =>
      api.put<Person>(`/api/person/${id}`, data), // Backend uses singular path
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
      queryClient.invalidateQueries({ queryKey: personKeys.detail(id) });
    },
  });
}

// Delete Person
export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/person/${id}`), // Backend uses singular path
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
    },
  });
}
