import { describe, it, expect } from "vitest";
import { parseReceiptText } from "../../shared/parsing/receiptParser.js";
import {
  NAIVAS_CLEAN,
  MPESA_PAYMENT_RECEIPT,
  QUICKMART_VAT_ADDITIVE,
  FADED_RECEIPT_NOISY,
  NO_DATE_RECEIPT,
  MISMATCHED_TOTAL_RECEIPT,
} from "../fixtures/sampleReceipts.js";

const NOW = new Date("2026-11-20T12:00:00Z");

describe("parseReceiptText — clean Kenyan supermarket receipt, VAT-inclusive pricing", () => {
  const result = parseReceiptText(NAIVAS_CLEAN, NOW);

  it("identifies the merchant from a known retailer name", () => {
    expect(result.merchantNameRaw).toBe("Naivas Supermarket");
    expect(result.merchantConfidence).toBe("high");
  });

  it("parses the DD/MM/YYYY date with time", () => {
    expect(result.purchasedAt?.toISOString().slice(0, 16)).toBe("2026-11-12T18:42");
    expect(result.dateConfidence).toBe("high");
  });

  it("extracts exactly the 5 purchasable line items, not the header/footer/summary lines", () => {
    expect(result.items).toHaveLength(5);
    expect(result.items.map((i) => i.description)).toEqual([
      "COOKING OIL 2L",
      "MAIZE FLOUR 2KG",
      "MILK 500ML",
      "SUKUMA WIKI",
      "BATHING SOAP",
    ]);
  });

  it("does not treat the pack size (2L, 2KG, 500ML) as a price or quantity", () => {
    const oil = result.items[0];
    expect(oil.quantity).toBe(1);
    expect(oil.unitPriceMinor).toBe(65000);
    expect(oil.lineTotalMinor).toBe(65000);
  });

  it("correctly reads an explicit '2 X 190.00' quantity marker", () => {
    const flour = result.items[1];
    expect(flour.quantity).toBe(2);
    expect(flour.unitPriceMinor).toBe(19000);
    expect(flour.lineTotalMinor).toBe(38000);
    expect(flour.isUncertain).toBe(false);
  });

  it("detects VAT-inclusive pricing (item prices already include the printed VAT line)", () => {
    expect(result.taxMode).toBe("inclusive");
    expect(result.computedTotalMinor).toBe(143500);
  });

  it("reconciles cleanly against the printed total", () => {
    expect(result.printedTotalMinor).toBe(143500);
    expect(result.totalMatches).toBe(true);
    expect(result.totalDiscrepancyMinor).toBe(0);
  });

  it("reads the payment method as Cash, and finds no stray M-Pesa code", () => {
    expect(result.paymentMethod).toBe("Cash");
    expect(result.mpesaCode).toBeNull();
  });
});

describe("parseReceiptText — M-Pesa payment", () => {
  const result = parseReceiptText(MPESA_PAYMENT_RECEIPT, NOW);

  it("extracts the M-Pesa confirmation code as the payment reference, never as an item or amount", () => {
    expect(result.paymentMethod).toBe("M-Pesa");
    expect(result.mpesaCode).toBe("QGH7X9K2L1");
  });

  it("does not create a line item out of the M-Pesa reference line", () => {
    const descriptions = result.items.map((i) => i.description);
    expect(descriptions.some((d) => d.includes("QGH7X9K2L1"))).toBe(false);
    expect(result.items).toHaveLength(2);
  });

  it("totals correctly without the confirmation code polluting the sum", () => {
    expect(result.lineItemsSumMinor).toBe(69000);
    expect(result.totalMatches).toBe(true);
  });
});

describe("parseReceiptText — VAT charged additively on top of the subtotal", () => {
  const result = parseReceiptText(QUICKMART_VAT_ADDITIVE, NOW);

  it("detects additive VAT (subtotal + VAT = total)", () => {
    expect(result.taxMode).toBe("additive");
    expect(result.subtotalMinor).toBe(175000);
    expect(result.taxMinor).toBe(28000);
    expect(result.computedTotalMinor).toBe(203000);
  });

  it("matches the printed total exactly", () => {
    expect(result.printedTotalMinor).toBe(203000);
    expect(result.totalMatches).toBe(true);
  });

  it("reads the card payment method", () => {
    expect(result.paymentMethod).toBe("Card");
  });

  it("extracts all three items with no quantity marker (implicit qty 1)", () => {
    expect(result.items).toHaveLength(3);
    expect(result.items.every((i) => i.quantity === 1)).toBe(true);
  });
});

describe("parseReceiptText — faded / noisy OCR output (O/0 and similar confusions)", () => {
  const result = parseReceiptText(FADED_RECEIPT_NOISY, NOW);

  it("still finds the merchant", () => {
    expect(result.merchantNameRaw).toBe("Chandarana Foodplus");
  });

  it("recovers a date despite O/0 noise in the digits", () => {
    expect(result.purchasedAt?.toISOString().slice(0, 10)).toBe("2026-01-12");
  });

  it("recovers correct prices despite heavy O/0 noise, including in the decimal part", () => {
    expect(result.items).toHaveLength(2);
    expect(result.items[0].lineTotalMinor).toBe(8500); // "85.OO" -> 85.00
    expect(result.items[1].lineTotalMinor).toBe(42000); // "42O.OO" -> 420.00
  });

  it("reconciles the noisy total correctly", () => {
    expect(result.printedTotalMinor).toBe(50500); // "5O5.OO" -> 505.00
    expect(result.totalMatches).toBe(true);
  });
});

describe("parseReceiptText — no date present anywhere on the receipt", () => {
  const result = parseReceiptText(NO_DATE_RECEIPT, NOW);

  it("returns a null date rather than guessing one", () => {
    expect(result.purchasedAt).toBeNull();
    expect(result.dateConfidence).toBe("none");
  });

  it("surfaces a warning asking the user to enter the date manually", () => {
    expect(result.warnings.some((w) => /date/i.test(w))).toBe(true);
  });

  it("still extracts the items and total correctly", () => {
    expect(result.items).toHaveLength(2);
    expect(result.totalMatches).toBe(true);
  });
});

describe("parseReceiptText — printed total disagrees with the line items", () => {
  const result = parseReceiptText(MISMATCHED_TOTAL_RECEIPT, NOW);

  it("never silently trusts the printed total over the line items", () => {
    expect(result.totalMatches).toBe(false);
    expect(result.totalDiscrepancyMinor).toBe(11000); // 520.00 printed vs 410.00 of items = 110.00 off
  });

  it("surfaces a warning about the mismatch", () => {
    expect(result.warnings.some((w) => /match/i.test(w))).toBe(true);
  });
});

describe("parseReceiptText — receipt with no identifiable items", () => {
  it("returns an empty item list with a helpful warning instead of inventing products", () => {
    const result = parseReceiptText("SOME SHOP\nTHANK YOU FOR SHOPPING", NOW);
    expect(result.items).toHaveLength(0);
    expect(result.warnings.some((w) => /manually/i.test(w))).toBe(true);
  });
});
