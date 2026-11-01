import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Sparkles } from "lucide-react";
import { useAnalyticsSummary } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney, ratio } from "@shared/money";

export default function Analytics() {
  const [range, setRange] = useState<"month" | "year">("month");
  const { data: summary, isLoading } = useAnalyticsSummary(range);

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (summary.receiptCount === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <EmptyState
          className="mt-8"
          icon={<Sparkles className="size-6" />}
          title="Nothing to analyze yet"
          description="Scan a few receipts and come back; your spending patterns will show up here automatically."
        />
      </div>
    );
  }

  const topCategory = summary.categoryBreakdown[0];
  const topStore = summary.storeBreakdown[0];
  const biggestDay = summary.dailyTrend.reduce((max, d) => (d.totalMinor > (max?.totalMinor ?? 0) ? d : max), summary.dailyTrend[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">A closer look at your household's spending patterns.</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as "month" | "year")}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <p className="font-display text-lg font-semibold">
            {range === "month" ? "Your month" : "Your year"} in review
          </p>
          <p className="mt-2 text-sm opacity-90">
            You spent <strong>{formatMoney(summary.totalSpentMinor)}</strong> across <strong>{summary.receiptCount}</strong> transaction
            {summary.receiptCount === 1 ? "" : "s"}
            {topCategory && (
              <>
                , with <strong>{topCategory.categoryName}</strong> ({formatMoney(topCategory.totalMinor)}) taking the largest share
              </>
            )}
            {topStore && (
              <>
                . You shopped most at <strong>{topStore.merchantName}</strong>
              </>
            )}
            {biggestDay && biggestDay.totalMinor > 0 && (
              <>
                , and your biggest single day was {new Date(biggestDay.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} at{" "}
                {formatMoney(biggestDay.totalMinor)}.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Average transaction" value={formatMoney(summary.averageTransactionMinor)} />
        <MiniStat label="Receipts saved" value={String(summary.receiptCount)} />
        <MiniStat
          label="Budget used"
          value={summary.monthlyBudgetUsedRatio != null ? `${Math.round(summary.monthlyBudgetUsedRatio * 100)}%` : "No budget set"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Spending</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="totalMinor" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.categoryBreakdown.map((c) => {
            const pct = ratio(c.totalMinor, summary.totalSpentMinor) * 100;
            return (
              <div key={c.categoryId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.categoryName}</span>
                  <span className="text-muted-foreground">
                    {formatMoney(c.totalMinor)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Purchased Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.topProducts.map((p) => (
              <div key={p.productName} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.productName}</p>
                  <p className="text-xs text-muted-foreground">{p.purchaseCount} purchase{p.purchaseCount === 1 ? "" : "s"}</p>
                </div>
                <span className="font-semibold">{formatMoney(p.totalMinor)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where You Shop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.storeBreakdown.map((s) => (
              <div key={s.merchantName} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{s.merchantName}</p>
                  <p className="text-xs text-muted-foreground">{s.visitCount} visit{s.visitCount === 1 ? "" : "s"}</p>
                </div>
                <span className="font-semibold">{formatMoney(s.totalMinor)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
