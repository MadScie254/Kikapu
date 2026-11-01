/**
 * All monetary values in Kikapu are stored and computed as integer MINOR UNITS
 * (cents) to avoid floating-point rounding errors. 1 KES = 100 minor units.
 *
 * Never do money math with `number` decimals (0.1 + 0.2 !== 0.3). Every
 * function here operates on integers and only converts to/from a decimal
 * string at the UI boundary.
 */

export type MinorUnits = number; // always an integer

/** Parse a user-facing decimal string ("1,234.50", "1234.5", "1234") into minor units. */
export function toMinorUnits(input: string | number): MinorUnits {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return 0;
    return Math.round(input * 100);
  }
  const cleaned = input.replace(/[^\d.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const parts = cleaned.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(2, "0").slice(0, 2);
  const sign = whole.startsWith("-") ? -1 : 1;
  const wholeAbs = whole.replace("-", "") || "0";
  const value = parseInt(wholeAbs, 10) * 100 + parseInt(frac || "0", 10);
  return sign * value;
}

/** Format minor units as a decimal string, e.g. 123456 -> "1234.56" */
export function minorToDecimalString(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${frac.toString().padStart(2, "0")}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: "KSh",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Format minor units as a display string with thousands separators, e.g. "KSh 1,234.56" */
export function formatMoney(
  minor: MinorUnits,
  currency: string = "KES",
  opts: { showSymbol?: boolean; compact?: boolean } = {}
): string {
  const { showSymbol = true, compact = false } = opts;
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;

  let numberPart: string;
  if (compact && whole >= 1_000_000) {
    numberPart = `${(whole / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  } else if (compact && whole >= 1_000) {
    numberPart = `${(whole / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  } else {
    const wholeStr = whole.toLocaleString("en-US");
    numberPart = `${wholeStr}.${frac.toString().padStart(2, "0")}`;
  }

  const symbol = showSymbol ? `${CURRENCY_SYMBOLS[currency] ?? currency} ` : "";
  return `${sign}${symbol}${numberPart}`;
}

export function addMoney(...values: MinorUnits[]): MinorUnits {
  return values.reduce((sum, v) => sum + Math.round(v || 0), 0);
}

export function subtractMoney(a: MinorUnits, b: MinorUnits): MinorUnits {
  return Math.round(a) - Math.round(b);
}

/** Multiply a money amount by a plain quantity (not another money amount). Rounds to nearest minor unit. */
export function multiplyMoney(amount: MinorUnits, quantity: number): MinorUnits {
  return Math.round(amount * quantity);
}

/** Percentage (0-100) of a money amount, rounded to nearest minor unit. */
export function percentOf(amount: MinorUnits, percent: number): MinorUnits {
  return Math.round((amount * percent) / 100);
}

/** Safe division returning a ratio (0-1), 0 if denominator is 0. */
export function ratio(numerator: MinorUnits, denominator: MinorUnits): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

/**
 * Reconcile a receipt: given line items' total, discounts, tax and the printed
 * final total, compute whether they agree and by how much.
 * Formula: subtotal - discounts + tax + otherCharges should equal finalTotal.
 */
export function reconcileReceiptTotal(input: {
  lineItemsSum: MinorUnits;
  discounts: MinorUnits;
  tax: MinorUnits;
  otherCharges: MinorUnits;
  printedTotal: MinorUnits | null;
}): { computedTotal: MinorUnits; discrepancy: MinorUnits; matches: boolean } {
  const computedTotal = addMoney(
    input.lineItemsSum,
    -Math.abs(input.discounts),
    input.tax,
    input.otherCharges
  );
  if (input.printedTotal == null) {
    return { computedTotal, discrepancy: 0, matches: true };
  }
  const discrepancy = subtractMoney(input.printedTotal, computedTotal);
  // Tolerate +/- 1 minor-unit-equivalent rounding noise per line item class (2 KES = 200 minor units is generous but
  // receipts frequently round each line to the shilling). We use a tight tolerance of 1 KES (100 minor units).
  const matches = Math.abs(discrepancy) <= 100;
  return { computedTotal, discrepancy, matches };
}
