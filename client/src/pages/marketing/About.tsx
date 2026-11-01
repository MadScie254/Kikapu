import { Heart, Target, ShieldCheck } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function About() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">About Kikapu</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          "Kikapu" is the Swahili word for a woven shopping basket — the thing you carry into the market and bring
          home full of the week's essentials. We named the app after it because that's exactly what it's for: making
          sense of everything that ends up in your basket.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          Kikapu was built around a simple scene: a mother gets home from shopping, receipt still in hand, and just
          wants to know — quickly, honestly — how much the household is spending and where it's going. Not a
          finance app built for spreadsheets. Not a budgeting tool that assumes you have hours to categorize
          transactions. Something that reads the receipt for you, asks you to confirm what it found, and gets out of
          the way.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div>
            <Target className="size-6 text-accent" />
            <h3 className="mt-3 font-display text-base font-semibold">Practical, not flashy</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Every feature exists because it answers a real question a shopper has — not because it was easy to build.
            </p>
          </div>
          <div>
            <ShieldCheck className="size-6 text-accent" />
            <h3 className="mt-3 font-display text-base font-semibold">Private by default</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your receipts are household financial records. We treat them that way — no ads, no data resale.
            </p>
          </div>
          <div>
            <Heart className="size-6 text-accent" />
            <h3 className="mt-3 font-display text-base font-semibold">Built for Kenya first</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              KES by default, VAT-aware parsing, and an understanding that not every purchase comes with a printed
              receipt.
            </p>
          </div>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Kikapu is an independent project. It is not affiliated with any supermarket chain, bank, or mobile money
          provider named or referenced in this product (including M-Pesa, which belongs to its respective owner).
        </p>
      </section>
    </MarketingLayout>
  );
}
