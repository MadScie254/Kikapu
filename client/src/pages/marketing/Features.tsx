import { Link } from "react-router-dom";
import {
  ScanLine, Wallet, BarChart3, ListChecks, ShieldCheck, Store, Receipt, Sparkles, Smartphone, Wifi,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  {
    icon: ScanLine,
    title: "Smart Receipt Scanning",
    description:
      "Photograph a receipt with your phone or drag one onto the page on desktop. A free, on-device OCR engine reads the merchant, date, items, quantities, prices and totals; no paid AI service required.",
  },
  {
    icon: Wallet,
    title: "Automatic Calculations",
    description:
      "Kikapu reconciles the line items against the printed subtotal and total, handling VAT correctly and flagging any mismatch so nothing silently gets miscounted.",
  },
  {
    icon: BarChart3,
    title: "Monthly Spending Dashboards",
    description:
      "See daily, weekly, monthly and yearly trends, broken down by category, store and product; with real numbers from your own saved receipts.",
  },
  {
    icon: Wallet,
    title: "Budget Tracking",
    description:
      "Set an overall household budget or per-category limits. Kikapu shows progress with friendly, non-judgmental messaging; never shaming, just informing.",
  },
  {
    icon: Receipt,
    title: "Shopping History",
    description:
      "A complete, searchable ledger of every transaction. Filter by store, category or date range, sort by amount, and export your data whenever you like.",
  },
  {
    icon: Store,
    title: "Price Comparisons",
    description:
      "Kikapu remembers what you paid for things at different stores, so you can see where a product has historically been cheapest; clearly labelled as historical, not live pricing.",
  },
  {
    icon: ListChecks,
    title: "Shopping Lists",
    description:
      "Plan your next trip with quantity and estimated cost; estimates are pulled from your own purchase history where available.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and Security",
    description:
      "Your data is protected with secure authentication, strict per-household access control, and private image storage. No ads, no unnecessary trackers.",
  },
  {
    icon: Smartphone,
    title: "Built Mobile-First",
    description:
      "A bottom navigation bar, large touch targets, and a one-tap scan button make Kikapu comfortable to use one-handed, right in the supermarket queue.",
  },
  {
    icon: Wifi,
    title: "Works Offline",
    description:
      "Capture a receipt or log a manual purchase with no signal; Kikapu saves a draft on your device and syncs it once you're back online.",
  },
  {
    icon: Sparkles,
    title: "Optional AI Enhancement",
    description:
      "If a deployment enables it, you can opt in per-scan to a higher-accuracy AI extraction. It's always off by default, always disclosed, and never required.",
  },
];

export default function Features() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Everything Kikapu does</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A focused set of tools built for one job: turning receipts into household financial clarity.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/40 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Ready to try it?</h2>
        <Button size="lg" className="mt-5" asChild>
          <Link to="/register">Start Tracking for Free</Link>
        </Button>
      </section>
    </MarketingLayout>
  );
}
