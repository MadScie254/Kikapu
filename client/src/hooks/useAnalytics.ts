import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalyticsSummary } from "@shared/types";

export function useAnalyticsSummary(range: "month" | "year" = "month") {
  return useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () => api.get<{ summary: AnalyticsSummary }>(`/analytics/summary?range=${range}`).then((r) => r.summary),
  });
}
