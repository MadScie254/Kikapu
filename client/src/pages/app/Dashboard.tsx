import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Wallet, Receipt, TrendingUp, ScanLine, CalendarDays, Store, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAnalyticsSummary } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@shared/money";
import { computeBudgetProgress, budgetMessage } from "@shared/budget";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<"month" | "year">("month");
  const { data: summary, isLoading } = useAnalyticsSummary(range);

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (summary.receiptCount === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome, {user?.displayName?.split(" ")[0]} 👋</h1>
        <EmptyState
          className="mt-8"
          icon={<ScanLine className="size-6" />}
          title="Let's see where your money goes"
          description="Scan your first receipt or log a market purchase, and your dashboard will fill in instantly."
          action={
            <Button size="lg" onClick={() => navigate("/app/scan")}>
              <ScanLine className="size-4" /> Scan Your First Receipt
            </Button>
          }
        />
      </div>
    );
  }

  const budgetProgress = computeBudgetProgress(summary.monthSpentMinor, summary.monthlyBudgetMinor);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back, {user?.displayName?.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your household spending at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as "month" | "year")}>
            <TabsList>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => navigate("/app/scan")}>
            <ScanLine className="size-4" /> Scan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Spent Today" valueMinor={summary.todaySpentMinor} formatValue={formatMoney} icon={<CalendarDays className="size-4.5" />} />
        <StatCard label="Spent This Week" valueMinor={summary.weekSpentMinor} formatValue={formatMoney} icon={<TrendingUp className="size-4.5" />} />
        <StatCard
          label={range === "month" ? "Spent This Month" : "Spent This Year"}
          valueMinor={summary.totalSpentMinor}
          formatValue={formatMoney}
          icon={<Wallet className="size-4.5" />}
          accent
        />
        <StatCard
          label="Remaining Budget"
          valueMinor={budgetProgress.status === "no-budget" ? 0 : budgetProgress.remainingMinor}
          formatValue={(n) => (budgetProgress.status === "no-budget" ? "No budget set" : formatMoney(n))}
          icon={<Wallet className="size-4.5" />}
        />
        <StatCard label="Receipts Saved" valueMinor={summary.receiptCount} formatValue={(n) => Math.round(n).toLocaleString()} icon={<Receipt className="size-4.5" />} />
        <StatCard label="Average Transaction" valueMinor={summary.averageTransactionMinor} formatValue={formatMoney} icon={<Package className="size-4.5" />} />
      </div>

      {budgetProgress.status !== "no-budget" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Monthly budget</span>
              <span className="text-muted-foreground">{budgetProgress.percentLabel} used</span>
            </div>
            <Progress
              className="mt-3"
              value={Math.min(100, budgetProgress.usedRatio * 100)}
              indicatorClassName={budgetProgress.status === "over-budget" ? "bg-destructive" : budgetProgress.status === "nearing-limit" ? "bg-warning" : undefined}
            />
            <p className="mt-2 text-xs text-muted-foreground">{budgetMessage("your household", budgetProgress)}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {summary.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => formatMoney(v)} labelFormatter={(l) => l} />
                  <Line type="monotone" dataKey="totalMinor" stroke="#10B981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this period yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {summary.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.categoryBreakdown} dataKey="totalMinor" nameKey="categoryName" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {summary.categoryBreakdown.map((c) => (
                      <Cell key={c.categoryId} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No categorized spending yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4" /> Top Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.topProducts.slice(0, 6).map((p) => (
              <div key={p.productName} className="flex items-center justify-between text-sm">
                <span className="truncate">{p.productName}</span>
                <span className="shrink-0 font-medium text-muted-foreground">{formatMoney(p.totalMinor)}</span>
              </div>
            ))}
            {summary.topProducts.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4" /> Top Stores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.storeBreakdown.slice(0, 6).map((s) => (
              <div key={s.merchantName} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.merchantName}</span>
                <span className="shrink-0 font-medium text-muted-foreground">{formatMoney(s.totalMinor)}</span>
              </div>
            ))}
            {summary.storeBreakdown.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
