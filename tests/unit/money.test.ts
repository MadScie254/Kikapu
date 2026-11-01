import { describe, it, expect } from "vitest";
import {
  toMinorUnits,
  minorToDecimalString,
  formatMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  percentOf,
  ratio,
  reconcileReceiptTotal,
} from "../../shared/money.js";

describe("toMinorUnits", () => {
  it("parses plain decimal strings", () => {
    expect(toMinorUnits("180.00")).toBe(18000);
    expect(toMinorUnits("180")).toBe(18000);
    expect(toMinorUnits("180.5")).toBe(18050);
  });

  it("strips thousands separators", () => {
    expect(toMinorUnits("1,234.50")).toBe(123450);
  });

  it("handles empty / garbage input as 0", () => {
    expect(toMinorUnits("")).toBe(0);
    expect(toMinorUnits("KSh")).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(toMinorUnits("-50.00")).toBe(-5000);
  });

  it("parses plain numbers avoiding float drift", () => {
    expect(toMinorUnits(19.9)).toBe(1990);
  });
});

describe("minorToDecimalString", () => {
  it("round-trips with toMinorUnits", () => {
    expect(minorToDecimalString(18000)).toBe("180.00");
    expect(minorToDecimalString(5)).toBe("0.05");
  });
});

describe("formatMoney", () => {
  it("formats with KSh symbol and thousands separators", () => {
    expect(formatMoney(123450)).toBe("KSh 1,234.50");
  });

  it("formats compactly when requested", () => {
    expect(formatMoney(1_500_000, "KES", { compact: true })).toBe("KSh 15K");
  });
});

describe("money arithmetic avoids float drift", () => {
  it("adds many small amounts exactly", () => {
    // Classic float trap: 0.1 + 0.2 !== 0.3 in IEEE754; minor units sidestep this.
    const total = addMoney(toMinorUnits("0.10"), toMinorUnits("0.20"));
    expect(total).toBe(30);
    expect(minorToDecimalString(total)).toBe("0.30");
  });

  it("subtracts correctly", () => {
    expect(subtractMoney(10000, 2500)).toBe(7500);
  });

  it("multiplies a price by a fractional quantity and rounds to the nearest minor unit", () => {
    expect(multiplyMoney(10000, 2.5)).toBe(25000);
    expect(multiplyMoney(333, 3)).toBe(999);
  });

  it("computes percentage amounts", () => {
    expect(percentOf(100000, 16)).toBe(16000);
  });

  it("computes a safe ratio, returning 0 for zero denominator", () => {
    expect(ratio(5000, 10000)).toBe(0.5);
    expect(ratio(5000, 0)).toBe(0);
  });
});

describe("reconcileReceiptTotal", () => {
  it("matches when line items minus discount plus tax equals the printed total", () => {
    const result = reconcileReceiptTotal({
      lineItemsSum: 100000,
      discounts: 5000,
      tax: 0,
      otherCharges: 0,
      printedTotal: 95000,
    });
    expect(result.matches).toBe(true);
    expect(result.computedTotal).toBe(95000);
    expect(result.discrepancy).toBe(0);
  });

  it("flags a real mismatch beyond the rounding tolerance", () => {
    const result = reconcileReceiptTotal({
      lineItemsSum: 100000,
      discounts: 0,
      tax: 0,
      otherCharges: 0,
      printedTotal: 92000,
    });
    expect(result.matches).toBe(false);
    expect(result.discrepancy).toBe(-8000);
  });

  it("tolerates a 1 KES rounding difference", () => {
    const result = reconcileReceiptTotal({
      lineItemsSum: 100000,
      discounts: 0,
      tax: 0,
      otherCharges: 0,
      printedTotal: 100050,
    });
    expect(result.matches).toBe(true);
  });

  it("never mistakes cash tendered / change for part of the total (caller must exclude them before calling)", () => {
    // This test documents the contract: reconcileReceiptTotal trusts its inputs completely -
    // it's the parser's job (tested separately) to never feed cash/change into lineItemsSum.
    const result = reconcileReceiptTotal({
      lineItemsSum: 143500,
      discounts: 0,
      tax: 0,
      otherCharges: 0,
      printedTotal: 143500,
    });
    expect(result.matches).toBe(true);
  });
});
