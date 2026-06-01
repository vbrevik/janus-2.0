import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  DocumentReference,
  CreateDocumentReferenceRequest,
  UpdateDocumentReferenceRequest,
  AttachmentUploadRequest,
} from "@/types/document-reference";
import type { ApiResponse } from "@/types/api";

// Query Keys
export const documentReferenceKeys = {
  all: ["document-references"] as const,
  list: (filters?: {
    person_id?: number;
    document_type?: string;
    status?: string;
  }) => [...documentReferenceKeys.all, "list", filters] as const,
  detail: (id: number) => [...documentReferenceKeys.all, id] as const,
};

// List document references
export function useDocumentReferencesList(filters?: {
  person_id?: number;
  document_type?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.person_id) params.append("person_id", String(filters.person_id)); // Changed from person_id
  if (filters?.document_type)
    params.append("document_type", filters.document_type);
  if (filters?.status) params.append("status", filters.status);

  return useQuery({
    queryKey: documentReferenceKeys.list(filters),
    queryFn: async () => {
      const queryString = params.toString();
      const url = queryString
        ? `/api/document-references?${queryString}`
        : "/api/document-references";
      const response = await apiFetch<
        DocumentReference[] | ApiResponse<DocumentReference[]>
      >(url);
      // Handle both array and ApiResponse formats
      if (Array.isArray(response)) {
        return response;
      }
      return (response as ApiResponse<DocumentReference[]>).data || [];
    },
    enabled: filters === undefined || !!filters.person_id, // Changed from person_id
  });
}

// Get single document reference
export function useDocumentReference(id: number) {
  return useQuery({
    queryKey: documentReferenceKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch<ApiResponse<DocumentReference>>(
        `/api/document-references/${id}`,
      );
      return response.data;
    },
    enabled: id > 0,
  });
}

// Create document reference
export function useCreateDocumentReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDocumentReferenceRequest) => {
      const response = await apiFetch<ApiResponse<DocumentReference>>(
        "/api/document-references",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentReferenceKeys.all });
    },
  });
}

// Update document reference
export function useUpdateDocumentReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateDocumentReferenceRequest;
    }) => {
      const response = await apiFetch<ApiResponse<DocumentReference>>(
        `/api/document-references/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentReferenceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: documentReferenceKeys.all });
    },
  });
}

// Delete document reference
export function useDeleteDocumentReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await apiFetch<ApiResponse<string>>(
        `/api/document-references/${id}`,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentReferenceKeys.all });
    },
  });
}

// Upload document attachment
export function useUploadDocumentAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: AttachmentUploadRequest;
    }) => {
      const response = await apiFetch<ApiResponse<DocumentReference>>(
        `/api/document-references/${id}/attachment`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentReferenceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: documentReferenceKeys.all });
    },
  });
}
