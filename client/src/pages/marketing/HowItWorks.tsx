import { Link } from "react-router-dom";
import { Camera, Sparkles, Pencil, LineChart, CheckCircle2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: Camera,
    title: "1. Scan your receipt",
    description:
      "Open the Scan page and take a photo, or upload one from your gallery. On desktop, just drag and drop the image in. You can rotate, crop and brighten it before processing.",
  },
  {
    icon: Sparkles,
    title: "2. Let Kikapu extract the details",
    description:
      "A free OCR engine (Tesseract.js) reads the text entirely in your browser — nothing is sent to a paid service. Kikapu then uses deterministic rules (not AI guesswork) to identify the merchant, date, items, quantities, prices, discounts and total.",
  },
  {
    icon: Pencil,
    title: "3. Review and save your shopping",
    description:
      "Every field is editable. Uncertain items are highlighted, and if the printed total doesn't match the line items, Kikapu tells you by how much. Nothing is saved until you confirm it.",
  },
  {
    icon: LineChart,
    title: "4. Discover where your money goes",
    description:
      "Once saved, your dashboard updates instantly — spending trends, category breakdowns, top products and store comparisons, all built from your real transactions.",
  },
];

const PRINCIPLES = [
  "Your confirmation is always the final authority before anything is saved.",
  "If OCR can't read a receipt, you can switch to manual entry immediately — no dead ends.",
  "M-Pesa codes, cash tendered and change are never mistaken for a product.",
  "No shopping trip, including open-air markets without receipts, is left out.",
];

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">How Kikapu works</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          From a crumpled receipt in your bag to a clear picture of your household spending.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="space-y-6">
          {STEPS.map((step) => (
            <Card key={step.title}>
              <CardContent className="flex gap-5 p-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <step.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold">What we promise, technically</h2>
          <ul className="mt-8 space-y-3">
            {PRINCIPLES.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 text-center">
        <Button size="lg" asChild>
          <Link to="/register">Start Tracking for Free</Link>
        </Button>
      </section>
    </MarketingLayout>
  );
}
