import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Users, Home as HomeIcon, Receipt, Wallet, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAdminOverview, useAdminHouseholds, useAdminHouseholdDetail } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@shared/money";
import { formatHumanDate } from "@shared/dates";

export default function Admin() {
  const { user } = useAuth();
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);

  // Server-side ownership checks already gate every /api/admin/* route; this
  // is a UI-only guard so a non-admin never sees the page shell flash in.
  if (user && user.role !== "admin") {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (selectedHouseholdId) {
    return <HouseholdDetail householdId={selectedHouseholdId} onBack={() => setSelectedHouseholdId(null)} />;
  }

  return <HouseholdsOverview onSelect={setSelectedHouseholdId} />;
}

function HouseholdsOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();
  const { data: households, isLoading: householdsLoading } = useAdminHouseholds();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Admin</h1>
          <Badge variant="accent">Super User</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A cross-household view, visible only to your account. Everyone else still only ever sees their own
          household.
        </p>
      </div>

      {overviewLoading || !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Households" valueMinor={overview.householdCount} formatValue={(n) => String(n)} icon={<HomeIcon className="size-4.5" />} />
          <StatCard label="Users" valueMinor={overview.userCount} formatValue={(n) => String(n)} icon={<Users className="size-4.5" />} />
          <StatCard label="Receipts Logged" valueMinor={overview.receiptCount} formatValue={(n) => String(n)} icon={<Receipt className="size-4.5" />} />
          <StatCard label="Total Tracked Spend" valueMinor={overview.totalSpentMinor} formatValue={formatMoney} icon={<Wallet className="size-4.5" />} accent />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Households</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {householdsLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}

          {!householdsLoading && households?.length === 0 && (
            <p className="text-sm text-muted-foreground">No households yet.</p>
          )}

          {households?.map((h) => (
            <button
              key={h.householdId}
              onClick={() => onSelect(h.householdId)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <div>
                <p className="font-semibold">{h.ownerDisplayName ?? h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {h.ownerEmail ?? "No owner"} · {h.receiptCount} receipt{h.receiptCount === 1 ? "" : "s"} · joined{" "}
                  {formatHumanDate(new Date(h.createdAt))}
                </p>
              </div>
              <span className="font-display font-bold">{formatMoney(h.totalSpentMinor)}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HouseholdDetail({ householdId, onBack }: { householdId: string; onBack: () => void }) {
  const { data, isLoading } = useAdminHouseholdDetail(householdId);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" /> Back to households
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold">{data.household.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.household.currency} household</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant="outline">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentReceipts.length === 0 && <p className="text-sm text-muted-foreground">No receipts yet.</p>}
          {data.recentReceipts.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{r.merchantNameRaw}</p>
                <p className="text-xs text-muted-foreground">{formatHumanDate(new Date(r.purchasedAt))}</p>
              </div>
              <span className="font-semibold">{formatMoney(r.totalMinor)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
