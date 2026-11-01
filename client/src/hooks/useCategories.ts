import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category } from "@shared/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ categories: Category[] }>("/categories").then((r) => r.categories),
    staleTime: 5 * 60_000,
  });
}
