import { describe, it, expect } from "vitest";
import { parseReceiptText } from "../../shared/parsing/receiptParser.js";
import {
  NAIVAS_CLEAN,
  MPESA_PAYMENT_RECEIPT,
  QUICKMART_VAT_ADDITIVE,
  FADED_RECEIPT_NOISY,
  NO_DATE_RECEIPT,
  MISMATCHED_TOTAL_RECEIPT,
  KHETIA_TWO_LINE_ITEMS,
  KHETIA_BARCODE_CODES,
} from "../fixtures/sampleReceipts.js";

const NOW = new Date("2026-11-20T12:00:00Z");

describe("parseReceiptText; clean Kenyan supermarket receipt, VAT-inclusive pricing", () => {
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

describe("parseReceiptText; M-Pesa payment", () => {
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

describe("parseReceiptText; VAT charged additively on top of the subtotal", () => {
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

describe("parseReceiptText; faded / noisy OCR output (O/0 and similar confusions)", () => {
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

describe("parseReceiptText; no date present anywhere on the receipt", () => {
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

describe("parseReceiptText; printed total disagrees with the line items", () => {
  const result = parseReceiptText(MISMATCHED_TOTAL_RECEIPT, NOW);

  it("never silently trusts the printed total over the line items", () => {
    expect(result.totalMatches).toBe(false);
    expect(result.totalDiscrepancyMinor).toBe(11000); // 520.00 printed vs 410.00 of items = 110.00 off
  });

  it("surfaces a warning about the mismatch", () => {
    expect(result.warnings.some((w) => /match/i.test(w))).toBe(true);
  });
});

describe("parseReceiptText; Khetia two-line item format with dotted product codes", () => {
  const result = parseReceiptText(KHETIA_TWO_LINE_ITEMS, NOW);

  it("identifies the merchant chain", () => {
    expect(result.merchantNameRaw).toBe("Khetia's Supermarket");
  });

  it("extracts exactly the 8 real products, not the header/MPESA/VAT-breakdown lines", () => {
    expect(result.items).toHaveLength(8);
    expect(result.items.map((i) => i.description)).toEqual([
      "BREAD OVEN FRESH 800G WHITE",
      "BREAD OVEN FRESH WHITE 1.5KG",
      "MILK LATO WHOLE 500ML FINO",
      "FRUIT FRESH KIWI",
      "FRUIT FRESH GRANNY SMITH APPLE (KG)",
      "FRUIT FRESH PINK LADY APPLE (KG)",
      "CUCUMBER ENGLISH FRESH(KAKDI)1KG",
      "VEGETABLE BHINDA OKRA",
    ]);
  });

  it("reads the dotted product code's quantity and price correctly, not as part of the price", () => {
    const milk = result.items[2];
    expect(milk.quantity).toBe(2);
    expect(milk.unitPriceMinor).toBe(8000);
    expect(milk.lineTotalMinor).toBe(16000);
    expect(milk.isUncertain).toBe(false);
  });

  it("reads a quantity whose decimal point OCR'd as a comma ('2,000' misread for '2.000')", () => {
    const bread = result.items[1];
    expect(bread.description).toBe("BREAD OVEN FRESH WHITE 1.5KG");
    expect(bread.quantity).toBe(1);
    const naturallyCommaQty = parseReceiptText(
      KHETIA_TWO_LINE_ITEMS.replace("0015.12.00    2.000 PC     80.00      160.00", "0015.12.00    2,000 PC     80.00      160.00"),
      NOW
    ).items[2];
    expect(naturallyCommaQty.quantity).toBe(2);
    expect(naturallyCommaQty.unitPriceMinor).toBe(8000);
    expect(naturallyCommaQty.lineTotalMinor).toBe(16000);
  });

  it("reads fractional KG quantities correctly", () => {
    const apple = result.items[4];
    expect(apple.quantity).toBe(0.4);
    expect(apple.unitPriceMinor).toBe(43400);
    expect(apple.lineTotalMinor).toBe(17360);
  });

  it("never turns the phone number, branch/till line, or MPESA details into an item", () => {
    const descriptions = result.items.map((i) => i.description);
    expect(descriptions.some((d) => /mobile|branch|till|session|rct/i.test(d))).toBe(false);
    expect(descriptions.some((d) => /amount|trn|mpesa/i.test(d))).toBe(false);
  });

  it("never turns a VAT-code breakdown row (A - 0.00% ...) into an item", () => {
    const descriptions = result.items.map((i) => i.description);
    expect(descriptions.some((d) => /^[AE]\s*-/.test(d))).toBe(false);
  });

  it("sums to exactly the printed total, with no double-counted or phantom amounts", () => {
    expect(result.lineItemsSumMinor).toBe(114643);
    expect(result.printedTotalMinor).toBe(114643);
    expect(result.totalMatches).toBe(true);
  });

  it("strips a product code an AI transcription glued onto the description line", () => {
    const withGluedCode = KHETIA_TWO_LINE_ITEMS.replace(
      "BREAD OVEN FRESH 800G WHITE                A\n0013.12.02    1.000 PC    113.00      113.00",
      "BREAD OVEN FRESH 800G WHITE 0013.12.02\n1.000 PC    113.00      113.00"
    );
    const bread = parseReceiptText(withGluedCode, NOW).items[0];
    expect(bread.description).toBe("BREAD OVEN FRESH 800G WHITE");
    expect(bread.unitPriceMinor).toBe(11300);
    expect(bread.lineTotalMinor).toBe(11300);
  });

  it("finds the real M-Pesa code even though an earlier 'MPESA PAY' line has no code on it", () => {
    expect(result.paymentMethod).toBe("M-Pesa");
    expect(result.mpesaCode).toBe("UK1HL04YT2");
  });
});

describe("parseReceiptText; Khetia two-line item format with plain barcode product codes", () => {
  const result = parseReceiptText(KHETIA_BARCODE_CODES, NOW);

  it("extracts exactly the 3 real products", () => {
    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.description)).toEqual([
      "BULB ENERGY SAVELITE 4.5W B22 COOL DAY",
      "BREAD OVEN FRESH 600G WHITE",
      "DRINK ENERGY MONSTER ENERGY 500ML",
    ]);
  });

  it("reads a plain non-decimal barcode's quantity and price correctly", () => {
    const bulb = result.items[0];
    expect(bulb.quantity).toBe(2);
    expect(bulb.unitPriceMinor).toBe(9000);
    expect(bulb.lineTotalMinor).toBe(18000);
    expect(bulb.isUncertain).toBe(false);
  });

  it("sums to exactly the printed total", () => {
    expect(result.lineItemsSumMinor).toBe(50300);
    expect(result.printedTotalMinor).toBe(50300);
    expect(result.totalMatches).toBe(true);
  });

  it("reads the payment method as Cash with no M-Pesa code", () => {
    expect(result.paymentMethod).toBe("Cash");
    expect(result.mpesaCode).toBeNull();
  });
});

describe("parseReceiptText; receipt with no identifiable items", () => {
  it("returns an empty item list with a helpful warning instead of inventing products", () => {
    const result = parseReceiptText("SOME SHOP\nTHANK YOU FOR SHOPPING", NOW);
    expect(result.items).toHaveLength(0);
    expect(result.warnings.some((w) => /manually/i.test(w))).toBe(true);
  });
});
