import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useBudgets, useUpsertBudget, type BudgetRow } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { formatMoney, minorToDecimalString, toMinorUnits } from "@shared/money";
import { computeBudgetProgress, budgetMessage } from "@shared/budget";
import { monthLabel, addMonths } from "@shared/dates";

export default function Budgets() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const periodMonth = monthDate.toISOString().slice(0, 7);
  const { data: budgets, isLoading } = useBudgets(periodMonth);
  const { data: categories = [] } = useCategories();
  const [editing, setEditing] = useState<{ categoryId: string; categoryName: string; amountMinor: number } | null>(null);

  const overall = budgets?.find((b) => b.isOverall);
  const categoryBudgets = budgets?.filter((b) => !b.isOverall) ?? [];
  const overallCategory = categories.find((c) => c.isOverall);
  const budgetedCategoryIds = new Set(categoryBudgets.map((b) => b.categoryId));
  const unbudgeted = categories.filter((c) => !c.isOverall && c.isActive && !budgetedCategoryIds.has(c.id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Budgets</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => addMonths(d, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-32 text-center text-sm font-medium">{monthLabel(monthDate)}</span>
          <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => addMonths(d, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <BudgetCard
            title="Overall Household Budget"
            amountMinor={overall?.amountMinor ?? 0}
            spentMinor={overall?.spentMinor ?? 0}
            onEdit={() => overallCategory && setEditing({ categoryId: overallCategory.id, categoryName: "Overall", amountMinor: overall?.amountMinor ?? 0 })}
          />

          {categoryBudgets.map((b) => (
            <BudgetCard
              key={b.id}
              title={b.categoryName}
              amountMinor={b.amountMinor}
              spentMinor={b.spentMinor}
              onEdit={() => setEditing({ categoryId: b.categoryId, categoryName: b.categoryName, amountMinor: b.amountMinor })}
            />
          ))}

          {unbudgeted.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-medium">Add a category budget</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {unbudgeted.map((c) => (
                    <Button key={c.id} variant="outline" size="sm" onClick={() => setEditing({ categoryId: c.id, categoryName: c.name, amountMinor: 0 })}>
                      + {c.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <BudgetEditDialog editing={editing} periodMonth={periodMonth} onClose={() => setEditing(null)} />
    </div>
  );
}

function BudgetCard({ title, amountMinor, spentMinor, onEdit }: { title: string; amountMinor: number; spentMinor: number; onEdit: () => void }) {
  const progress = computeBudgetProgress(spentMinor, amountMinor || null);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{title}</p>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
        </div>
        {progress.status === "no-budget" ? (
          <p className="mt-2 text-sm text-muted-foreground">No budget set yet.</p>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>{formatMoney(spentMinor)} spent</span>
              <span className="text-muted-foreground">of {formatMoney(amountMinor)}</span>
            </div>
            <Progress
              className="mt-2"
              value={Math.min(100, progress.usedRatio * 100)}
              indicatorClassName={progress.status === "over-budget" ? "bg-destructive" : progress.status === "nearing-limit" ? "bg-warning" : undefined}
            />
            <p className="mt-2 text-xs text-muted-foreground">{budgetMessage(title, progress)}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetEditDialog({
  editing,
  periodMonth,
  onClose,
}: {
  editing: { categoryId: string; categoryName: string; amountMinor: number } | null;
  periodMonth: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const upsert = useUpsertBudget();
  const [value, setValue] = useState("");

  if (editing && value === "" && editing.amountMinor > 0) {
    setValue(minorToDecimalString(editing.amountMinor));
  }

  async function save() {
    if (!editing) return;
    try {
      await upsert.mutateAsync({ categoryId: editing.categoryId, periodMonth, amountMinor: toMinorUnits(value || "0") });
      toast({ title: "Budget saved", variant: "success" });
      setValue("");
      onClose();
    } catch {
      toast({ title: "Couldn't save budget", variant: "destructive" });
    }
  }

  return (
    <Dialog
      open={!!editing}
      onOpenChange={(open) => {
        if (!open) {
          setValue("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing?.categoryName} budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Monthly amount (KSh)</Label>
          <Input type="number" min="0" step="1" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
