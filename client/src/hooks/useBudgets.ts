import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface BudgetRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  isOverall: boolean;
  periodMonth: string;
  amountMinor: number;
  spentMinor: number;
}

export function useBudgets(periodMonth: string) {
  return useQuery({
    queryKey: ["budgets", periodMonth],
    queryFn: () => api.get<{ budgets: BudgetRow[] }>(`/budgets?periodMonth=${periodMonth}`).then((r) => r.budgets),
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { categoryId: string; periodMonth: string; amountMinor: number }) => api.post("/budgets", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
