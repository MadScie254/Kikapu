import { ratio } from "./money.js";

export type BudgetStatus = "on-track" | "nearing-limit" | "over-budget" | "no-budget";

export interface BudgetProgress {
  spentMinor: number;
  budgetMinor: number;
  usedRatio: number; // 0-1+ (can exceed 1 when over budget)
  remainingMinor: number;
  status: BudgetStatus;
  percentLabel: string;
}

/** Pure budget math: how much of a budget has been used and what state that's in. */
export function computeBudgetProgress(spentMinor: number, budgetMinor: number | null): BudgetProgress {
  if (budgetMinor == null || budgetMinor <= 0) {
    return {
      spentMinor,
      budgetMinor: 0,
      usedRatio: 0,
      remainingMinor: 0,
      status: "no-budget",
      percentLabel: "—",
    };
  }
  const usedRatio = ratio(spentMinor, budgetMinor);
  const remainingMinor = budgetMinor - spentMinor;
  let status: BudgetStatus = "on-track";
  if (usedRatio >= 1) status = "over-budget";
  else if (usedRatio >= 0.8) status = "nearing-limit";

  return {
    spentMinor,
    budgetMinor,
    usedRatio,
    remainingMinor,
    status,
    percentLabel: `${Math.round(usedRatio * 100)}%`,
  };
}

/** Friendly, non-judgmental budget message per spec section 9. */
export function budgetMessage(categoryName: string, progress: BudgetProgress): string {
  if (progress.status === "no-budget") return `No budget set for ${categoryName} yet.`;
  const pct = Math.round(progress.usedRatio * 100);
  if (progress.status === "over-budget") {
    return `You've used ${pct}% of your ${categoryName} budget this month — ${Math.abs(
      progress.remainingMinor / 100
    ).toFixed(0)} KSh over.`;
  }
  if (progress.status === "nearing-limit") {
    return `You've used ${pct}% of your ${categoryName} budget this month.`;
  }
  return `You've used ${pct}% of your ${categoryName} budget this month — on track.`;
}
