import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ScanLine, ArrowRight, Info } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DEMO_RECEIPT_LINES,
  DEMO_ITEMS,
  DEMO_TOTAL_MINOR,
  DEMO_WEEKLY_TREND,
  DEMO_CATEGORY_BREAKDOWN,
  DEMO_MONTHLY_BUDGET_MINOR,
  DEMO_MONTH_SPENT_MINOR,
} from "@/lib/demoData";
import { formatMoney } from "@shared/money";

export default function Demo() {
  const [revealed, setRevealed] = useState(false);

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Try a Demo Receipt</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            This page uses a fixed sample receipt so you can see the full flow without creating an account.
          </p>
        </div>

        <Alert className="mt-8">
          <Info className="size-4" />
          <AlertDescription>
            Everything below is sample data, kept separate from any real account. Nothing here is saved anywhere.
          </AlertDescription>
        </Alert>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sample Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                {DEMO_RECEIPT_LINES.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
              {!revealed && (
                <Button className="mt-5 w-full" onClick={() => setRevealed(true)}>
                  <ScanLine className="size-4" /> Extract This Receipt
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className={revealed ? "" : "opacity-50"}>
            <CardHeader>
              <CardTitle>Extracted Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              {revealed ? (
                <div className="space-y-2">
                  {DEMO_ITEMS.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatMoney(item.unitPriceMinor)} · {item.category}
                        </p>
                      </div>
                      <span className="font-semibold">{formatMoney(item.lineTotalMinor)}</span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-primary px-3 py-3 font-semibold text-primary-foreground">
                    <span>Total</span>
                    <span>{formatMoney(DEMO_TOTAL_MINOR)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Extract the receipt on the left to see the result here.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {revealed && (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sample Week's Spending</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEMO_WEEKLY_TREND}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Bar dataKey="totalMinor" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={DEMO_CATEGORY_BREAKDOWN} dataKey="totalMinor" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {DEMO_CATEGORY_BREAKDOWN.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sample Monthly Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(DEMO_MONTH_SPENT_MINOR)} spent of a {formatMoney(DEMO_MONTHLY_BUDGET_MINOR)} household budget this month.
                </p>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (DEMO_MONTH_SPENT_MINOR / DEMO_MONTHLY_BUDGET_MINOR) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link to="/register">
              Create your free account <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
