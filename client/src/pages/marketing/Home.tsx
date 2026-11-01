import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ScanLine,
  Sparkles,
  Wallet,
  BarChart3,
  ListChecks,
  ShieldCheck,
  Store,
  Receipt,
  ArrowRight,
  Camera,
  Pencil,
  LineChart,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { HeroDemo } from "@/components/marketing/HeroDemo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { icon: ScanLine, title: "Smart Receipt Scanning", description: "Snap a photo and Kikapu reads the merchant, items, and totals — right in your browser, no cloud AI required." },
  { icon: Wallet, title: "Automatic Calculations", description: "Quantities, discounts, and VAT reconciled against the printed total, with any mismatch flagged for you." },
  { icon: BarChart3, title: "Spending Dashboards", description: "Daily, weekly, and monthly trends broken down by category, store, and product." },
  { icon: Wallet, title: "Budget Tracking", description: "Set an overall or per-category budget and see exactly how much is left, without judgment." },
  { icon: Receipt, title: "Shopping History", description: "Every receipt, searchable by store, product, date, or amount." },
  { icon: Store, title: "Price Comparisons", description: "See which recorded store has historically had the lowest price on something you buy often." },
  { icon: ListChecks, title: "Shopping Lists", description: "Plan your next trip with cost estimates pulled from your own purchase history." },
  { icon: ShieldCheck, title: "Privacy First", description: "Your receipts are yours. Private by default, with no ads and no unnecessary tracking." },
];

const STEPS = [
  { icon: Camera, title: "Scan your receipt", description: "Snap a photo with your phone or upload one from your gallery." },
  { icon: Sparkles, title: "Let Kikapu extract the details", description: "Free on-device OCR reads the store, items, prices and totals." },
  { icon: Pencil, title: "Review and save your shopping", description: "Fix anything that looks off — you always have the final word." },
  { icon: LineChart, title: "Discover where your money goes", description: "Instant dashboards show patterns across days, categories, and stores." },
];

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" /> Free OCR · No AI subscription required
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Know where every <span className="text-accent">shilling</span> goes.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Turn everyday shopping receipts into smarter household decisions. Simply scan, save, and understand
              your spending, all in one beautiful place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/register">
                  Start Tracking for Free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/how-it-works">See How It Works</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card. No AI key required. Built for Kenyan households.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <HeroDemo />
          </motion.div>
        </div>
      </section>

      {/* The problem */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Shopping receipts pile up. Clarity doesn't.</h2>
          <p className="mt-4 text-muted-foreground">
            You know roughly what you spent this month — but not exactly where it went, which store was cheaper, or
            whether that cooking oil really did get more expensive. Kikapu turns the paper in your bag into answers.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold">How It Works</h2>
          <p className="mt-3 text-muted-foreground">From receipt to insight in four simple steps.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display font-bold">
                    {i + 1}
                  </div>
                  <step.icon className="mt-4 size-5 text-accent" />
                  <h3 className="mt-3 font-display text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold">Everything a household needs</h2>
            <p className="mt-3 text-muted-foreground">No clutter. Just the tools that actually help you spend smarter.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="transition-shadow hover:shadow-soft-lg">
                <CardContent className="p-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold">See it in action — no account needed</h2>
        <p className="mt-3 text-muted-foreground">Explore a sample receipt and dashboard before you sign up.</p>
        <Button size="lg" variant="accent" className="mt-6" asChild>
          <Link to="/demo">Try a Demo Receipt</Link>
        </Button>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-muted/40 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold">Frequently Asked Questions</h2>
          <div className="mt-10 space-y-4">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-card p-5 open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to see where it all goes?</h2>
        <p className="mt-3 text-muted-foreground">Free to start. Your receipts stay private.</p>
        <Button size="lg" className="mt-6" asChild>
          <Link to="/register">
            Start Tracking for Free <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </MarketingLayout>
  );
}

const FAQ = [
  { q: "Do I need to pay for an AI subscription?", a: "No. Kikapu's core scanning uses a free, on-device OCR engine. An optional AI enhancement can be enabled later by whoever deploys the app, and you choose per-scan whether to use it." },
  { q: "Is my shopping data private?", a: "Yes. Your receipts and transactions are only visible to you (and household members you add later). We don't sell data or run ads." },
  { q: "What if the scan gets something wrong?", a: "You review and correct every field before anything is saved — scanning never saves data without your confirmation." },
  { q: "Does it work without receipts, like at a market?", a: "Yes. Local Market Mode lets you log a quick manual purchase — tomatoes, onions, sukuma wiki — in seconds." },
  { q: "What currency does it use?", a: "Kenyan Shillings (KES) by default, shown as KSh throughout." },
];
