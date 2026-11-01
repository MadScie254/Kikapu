import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface StoreRow {
  merchantId: string;
  name: string;
  location: string | null;
  totalSpentMinor: number;
  visitCount: number;
  lastVisit: string | null;
}

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => api.get<{ stores: StoreRow[] }>("/stores").then((r) => r.stores),
  });
}

export interface PriceHistoryEntry {
  merchantName: string;
  unitPriceMinor: number;
  purchasedAt: string;
  description: string;
}

export function usePriceHistory(product: string) {
  return useQuery({
    queryKey: ["price-history", product],
    queryFn: () =>
      api.get<{ history: PriceHistoryEntry[]; cheapestStore: { merchantName: string; unitPriceMinor: number } | null }>(
        `/stores/price-history?product=${encodeURIComponent(product)}`
      ),
    enabled: product.trim().length > 1,
  });
}
