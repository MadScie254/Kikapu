import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AdminOverview {
  userCount: number;
  householdCount: number;
  receiptCount: number;
  totalSpentMinor: number;
}

export interface AdminHouseholdRow {
  householdId: string;
  name: string;
  currency: string;
  createdAt: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  receiptCount: number;
  totalSpentMinor: number;
  lastReceiptAt: string | null;
}

export interface AdminHouseholdDetail {
  household: {
    id: string;
    name: string;
    currency: string;
    monthlyBudgetMinor: number | null;
    createdAt: string;
  };
  members: Array<{ userId: string; email: string; displayName: string; role: string; joinedAt: string }>;
  recentReceipts: Array<{ id: string; merchantNameRaw: string; totalMinor: number; purchasedAt: string }>;
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api.get<{ overview: AdminOverview }>("/admin/overview").then((r) => r.overview),
  });
}

export function useAdminHouseholds() {
  return useQuery({
    queryKey: ["admin", "households"],
    queryFn: () => api.get<{ households: AdminHouseholdRow[] }>("/admin/households").then((r) => r.households),
  });
}

export function useAdminHouseholdDetail(householdId: string | null) {
  return useQuery({
    queryKey: ["admin", "households", householdId],
    queryFn: () => api.get<AdminHouseholdDetail>(`/admin/households/${householdId}`),
    enabled: !!householdId,
  });
}
