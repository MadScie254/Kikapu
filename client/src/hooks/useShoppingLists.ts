import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ShoppingList } from "@shared/types";

export interface ShoppingListSummary extends ShoppingList {
  itemCount: number;
  purchasedCount: number;
  estimatedTotalMinor: number;
}

export function useShoppingLists() {
  return useQuery({
    queryKey: ["shopping-lists"],
    queryFn: () => api.get<{ lists: ShoppingListSummary[] }>("/shopping-lists").then((r) => r.lists),
  });
}

export function useShoppingList(id: string | undefined) {
  return useQuery({
    queryKey: ["shopping-list", id],
    queryFn: () => api.get<{ list: ShoppingList }>(`/shopping-lists/${id}`).then((r) => r.list),
    enabled: !!id,
  });
}

export function useCreateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<{ list: ShoppingList }>("/shopping-lists", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
  });
}

export function useDeleteShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/shopping-lists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
  });
}

export function useAddShoppingListItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; quantity: number; estimatedPriceMinor?: number | null }) =>
      api.post(`/shopping-lists/${listId}/items`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-list", listId] });
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });
}

export function useUpdateShoppingListItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...input }: { itemId: string; purchased?: boolean; name?: string; quantity?: number; estimatedPriceMinor?: number | null }) =>
      api.put(`/shopping-lists/${listId}/items/${itemId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-list", listId] });
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });
}

export function useDeleteShoppingListItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/shopping-lists/${listId}/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-list", listId] });
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });
}
