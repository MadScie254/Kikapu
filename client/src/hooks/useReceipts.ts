import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Receipt } from "@shared/types";

export interface ReceiptListFilters {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  page?: number;
  pageSize?: number;
}

export interface ReceiptListItem extends Receipt {
  itemCount: number;
}

interface ReceiptListResponse {
  receipts: ReceiptListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function toQueryString(filters: ReceiptListFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  return params.toString();
}

export function useReceiptsList(filters: ReceiptListFilters) {
  return useQuery({
    queryKey: ["receipts", filters],
    queryFn: () => api.get<ReceiptListResponse>(`/receipts?${toQueryString(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ["receipt", id],
    queryFn: () => api.get<{ receipt: Receipt }>(`/receipts/${id}`).then((r) => r.receipt),
    enabled: !!id,
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/receipts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateReceipt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put<{ receipt: Receipt }>(`/receipts/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipt", id] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
