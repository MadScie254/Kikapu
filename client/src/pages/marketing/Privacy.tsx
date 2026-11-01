import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function Privacy() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-display text-lg font-semibold">What we store</h2>
            <p className="mt-2 text-muted-foreground">
              Your account email and a securely hashed password; your display name and currency preference; the
              receipts and shopping transactions you save (merchant, date, items, prices, totals); budgets and
              shopping lists you create; and, if you choose to keep it, a photo of the receipt itself.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">What we never do</h2>
            <p className="mt-2 text-muted-foreground">
              We don't sell your data, show ads, or share your shopping records with third parties for marketing.
              We don't guess financial totals on your behalf — every number comes from a receipt you confirmed or
              an amount you entered yourself.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">Receipt images</h2>
            <p className="mt-2 text-muted-foreground">
              By default, receipt photos (when storage is configured on a given deployment) are kept privately and
              only ever served back to you through an authenticated request — the storage link itself is never
              exposed to your browser. If image storage isn't configured, your receipt's structured data is still
              saved; the photo simply isn't kept.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">Optional AI processing</h2>
            <p className="mt-2 text-muted-foreground">
              Kikapu's default scanning runs entirely in your browser using free, open OCR — no image is sent
              anywhere. Some deployments may offer an optional AI-enhanced scan using a third-party vision model
              (currently Google Gemini). This is always off unless you explicitly opt in for that specific scan, and
              you're told before the image leaves your device.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">Your controls</h2>
            <p className="mt-2 text-muted-foreground">
              From Settings, you can export your data (JSON or CSV), delete individual receipts, or permanently
              delete your account and all associated household data. Account deletion cannot be undone.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about this policy or your data can be directed to the team operating your specific Kikapu
              deployment.
            </p>
          </section>
        </div>
      </section>
    </MarketingLayout>
  );
}
