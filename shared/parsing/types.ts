export interface ParsedLineItem {
  rawLine: string;
  description: string;
  normalizedName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  categorySlug: string;
  isUncertain: boolean;
  uncertainReason?: string;
}

export interface ParsedReceiptResult {
  merchantNameRaw: string | null;
  merchantConfidence: "high" | "medium" | "low";
  purchasedAt: Date | null;
  dateConfidence: "high" | "medium" | "low" | "none";
  receiptNumber: string | null;
  paymentMethod: string | null;
  mpesaCode: string | null;
  items: ParsedLineItem[];
  subtotalMinor: number | null;
  discountMinor: number;
  taxMinor: number;
  taxMode: "inclusive" | "additive" | "unknown";
  printedTotalMinor: number | null;
  lineItemsSumMinor: number;
  computedTotalMinor: number;
  totalDiscrepancyMinor: number;
  totalMatches: boolean;
  warnings: string[];
  rawText: string;
}
