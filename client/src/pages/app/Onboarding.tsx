import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBasket, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_CATEGORIES } from "@shared/categories";
import { toMinorUnits } from "@shared/money";
import type { PublicUser } from "@shared/types";
import { cn } from "@/lib/utils";

const STEPS = ["Your name", "Currency & budget", "Shopping categories", "Get started"] as const;
const SELECTABLE_CATEGORIES = DEFAULT_CATEGORIES.filter((c) => c.slug !== "other" && c.slug !== "market");

export default function Onboarding() {
  const { user, setUser, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [budgetInput, setBudgetInput] = useState("");
  const [selected, setSelected] = useState<string[]>(SELECTABLE_CATEGORIES.slice(0, 6).map((c) => c.slug));
  const [submitting, setSubmitting] = useState(false);

  function toggleCategory(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function finish(goTo: string) {
    setSubmitting(true);
    try {
      const { user: updated } = await api.post<{ user: PublicUser }>("/user/onboarding", {
        displayName: displayName || undefined,
        currency: "KES",
        monthlyBudgetMinor: budgetInput ? toMinorUnits(budgetInput) : null,
        selectedCategorySlugs: selected,
      });
      setUser(updated);
      navigate(goTo, { replace: true });
    } catch {
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-lg flex-1">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBasket className="size-4.5" />
          </div>
          <span className="font-display text-lg font-bold">Kikapu</span>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className={cn("h-1.5 w-10 rounded-full", i <= step ? "bg-accent" : "bg-muted")} />
          ))}
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">What should we call you?</h2>
                <p className="text-sm text-muted-foreground">This is just for your dashboard greeting.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Amina Wanjiru" />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">Set a monthly budget (optional)</h2>
                <p className="text-sm text-muted-foreground">
                  Kikapu uses Kenyan Shillings (KES) by default. You can set or change this anytime in Settings.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="budget">Monthly household budget (KSh)</Label>
                  <Input id="budget" type="number" min="0" placeholder="e.g. 35000" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">What do you usually shop for?</h2>
                <p className="text-sm text-muted-foreground">Pick a few — you can add or change categories later.</p>
                <div className="flex flex-wrap gap-2">
                  {SELECTABLE_CATEGORIES.map((cat) => {
                    const active = selected.includes(cat.slug);
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => toggleCategory(cat.slug)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                          active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {active && <Check className="size-3.5" />}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <h2 className="font-display text-xl font-bold">You're all set, {displayName || "there"}!</h2>
                <p className="text-sm text-muted-foreground">Scan your first receipt now, or explore the dashboard first.</p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft className="size-4" /> Back
              </Button>

              {step < STEPS.length - 1 ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => finish("/app/dashboard")} disabled={submitting}>
                    Skip for now
                  </Button>
                  <Button onClick={() => setStep((s) => s + 1)}>
                    Next <ArrowRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => finish("/app/dashboard")} disabled={submitting}>
                    Go to Dashboard
                  </Button>
                  <Button onClick={() => finish("/app/scan")} disabled={submitting}>
                    Scan First Receipt <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
