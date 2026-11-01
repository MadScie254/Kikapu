import { describe, it, expect } from "vitest";
import { computeBudgetProgress, budgetMessage } from "../../shared/budget.js";

describe("computeBudgetProgress", () => {
  it("reports no-budget when none is set", () => {
    const p = computeBudgetProgress(5000, null);
    expect(p.status).toBe("no-budget");
  });

  it("reports on-track under 80% usage", () => {
    const p = computeBudgetProgress(50000, 100000);
    expect(p.status).toBe("on-track");
    expect(p.usedRatio).toBe(0.5);
    expect(p.remainingMinor).toBe(50000);
  });

  it("reports nearing-limit at 80% or more", () => {
    const p = computeBudgetProgress(81000, 100000);
    expect(p.status).toBe("nearing-limit");
  });

  it("reports over-budget at or beyond 100%", () => {
    const p = computeBudgetProgress(120000, 100000);
    expect(p.status).toBe("over-budget");
    expect(p.remainingMinor).toBe(-20000);
    expect(p.percentLabel).toBe("120%");
  });

  it("treats a zero budget the same as no budget (avoids divide-by-zero)", () => {
    const p = computeBudgetProgress(5000, 0);
    expect(p.status).toBe("no-budget");
  });
});

describe("budgetMessage", () => {
  it("is non-judgmental when on track", () => {
    const p = computeBudgetProgress(30000, 100000);
    expect(budgetMessage("Groceries", p)).toMatch(/on track/i);
  });

  it("states the overage plainly when over budget", () => {
    const p = computeBudgetProgress(150000, 100000);
    const msg = budgetMessage("Groceries", p);
    expect(msg).toMatch(/over/i);
    expect(msg).toMatch(/500/); // 50000 minor units over = 500 KSh
  });
});
