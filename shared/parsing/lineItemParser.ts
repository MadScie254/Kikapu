import { toMinorUnits } from "../money.js";
import { guessCategorySlug } from "../categories.js";
import { extractNumberTokens } from "./textNormalize.js";
import { fixDateOcrNoise } from "../dates.js";
import type { ParsedLineItem } from "./types.js";

/**
 * Lines that describe receipt-level totals/payment, never a purchased
 * product. Matched BEFORE line-item parsing so e.g. "SUBTOTAL 1,240.00" is
 * never mistaken for a product called "Subtotal".
 */
const SUMMARY_LINE_RE =
  /^\s*(sub\s?-?total|total|grand\s?total|amount\s?due|vat\b|v\.a\.t\.?|tax\b|discount|disc\b|less\b|cash\b(?!ier)|change\b|balance\b|tender(?:ed)?|m[\-\s]?pesa|visa|mastercard|card\s?payment|points?\s?earned|loyalty|round\s?(?:off|up|down)|no\.?\s*of\s*items?|items?\s*:\s*\d+|qty\s*:\s*\d+|served\s?by|cashier|till\s?no|^\*+$|thank\s?you|customer\s?copy)/i;

export function isSummaryLine(line: string): boolean {
  return SUMMARY_LINE_RE.test(line.trim());
}

/** Lines that are pure metadata (address, phone, barcodes) — skip entirely, not an item and not a summary field. */
const METADATA_LINE_RE =
  /^(tel|phone|p\.?o\.?\s?box|pin\s?(?:no)?\s*[:#]|vat\s?reg|address|location|email|www\.|http|receipt\s?no|invoice\s?no|date\s*[:\/]|time\s*:)/i;

// A line that is ENTIRELY a date (optionally with a time), with nothing else
// on it — e.g. "12/11/2026", "12-O1-2O26 18:42" (after OCR noise-fixing).
// Receipts often print the transaction date/time on its own line with no
// "Date:" label, so this can't rely on a keyword prefix like the metadata
// regex above; it has to recognize the whole-line shape instead.
const BARE_DATE_LINE_RE =
  /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?)?$|^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}(\s+\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?)?$/i;

export function isBareDateLine(line: string): boolean {
  return BARE_DATE_LINE_RE.test(fixDateOcrNoise(line.trim()));
}

export function isMetadataLine(line: string): boolean {
  return METADATA_LINE_RE.test(line.trim()) || /^[\d\s\-]{10,}$/.test(line.trim()) || isBareDateLine(line);
}

const QTY_PREFIX_RE = /^(\d+(?:\.\d+)?)\s*(?:x|X|\*|pcs?|@)\s*$/;

/**
 * Attempt to parse a single receipt line into a product line item.
 * Returns null if the line clearly isn't a purchasable item line.
 */
export function parseLineItem(rawLine: string): ParsedLineItem | null {
  const line = rawLine.trim();
  if (!line || line.length < 3) return null;
  if (isSummaryLine(line) || isMetadataLine(line)) return null;

  const allNumbers = extractNumberTokens(line);
  if (allNumbers.length === 0) return null;

  // Drop pack-size numbers glued to a unit abbreviation ("2L", "500ML",
  // "2KG", "400G") — these describe the product, not its price, and would
  // otherwise get mistaken for a quantity or unit price below.
  const PACK_SIZE_SUFFIX_RE = /^(kg|g|ml|l|ltr|ltrs|pcs|pc|pkt|pack)\b/i;
  const numbers = allNumbers.filter((tok) => {
    const after = line.slice(tok.index + tok.raw.length, tok.index + tok.raw.length + 4);
    return !PACK_SIZE_SUFFIX_RE.test(after);
  });
  if (numbers.length === 0) return null;

  let qty = 1;
  let unitPriceValue: number;
  let lineTotalValue: number;
  let descEndIndex: number;
  let isUncertain = false;
  let uncertainReason: string | undefined;

  if (numbers.length >= 3) {
    const [qtyTok, priceTok, totalTok] = numbers.slice(-3);
    const between = line.slice(qtyTok.index + qtyTok.raw.length, priceTok.index);
    const looksLikeQtyMarker = /^\s*[xX@*]?\s*$/.test(between) && qtyTok.value > 0 && qtyTok.value <= 1000;
    if (looksLikeQtyMarker) {
      qty = qtyTok.value;
      unitPriceValue = priceTok.value;
      lineTotalValue = totalTok.value;
      descEndIndex = qtyTok.index;
      const expected = qty * unitPriceValue;
      if (Math.abs(expected - lineTotalValue) > Math.max(0.5, expected * 0.02)) {
        isUncertain = true;
        uncertainReason = "Quantity × unit price doesn't match the line total — please verify.";
      }
    } else {
      // Three numbers but not a clean qty-marker pattern: fall back to treating
      // the last two as unit price + line total, ignore the earlier one (likely
      // a product code or weight) but flag for review.
      unitPriceValue = priceTok.value;
      lineTotalValue = totalTok.value;
      descEndIndex = priceTok.index;
      isUncertain = true;
      uncertainReason = "Multiple numbers found on this line — quantity may be wrong.";
    }
  } else if (numbers.length === 2) {
    const [a, b] = numbers;
    unitPriceValue = a.value;
    lineTotalValue = b.value;
    descEndIndex = a.index;
    if (unitPriceValue > 0) {
      const impliedQty = lineTotalValue / unitPriceValue;
      const rounded = Math.round(impliedQty);
      if (rounded >= 1 && rounded <= 1000 && Math.abs(impliedQty - rounded) <= 0.03) {
        qty = rounded;
      } else if (Math.abs(unitPriceValue - lineTotalValue) < 0.01) {
        qty = 1;
      } else {
        qty = 1;
        isUncertain = true;
        uncertainReason = "Couldn't confirm quantity from this line — defaulted to 1.";
      }
    }
  } else {
    // Only one number on the line: assume quantity 1 at that price.
    unitPriceValue = numbers[0].value;
    lineTotalValue = numbers[0].value;
    descEndIndex = numbers[0].index;
  }

  let description = line.slice(0, descEndIndex).trim();
  description = description.replace(/^[\d]{8,}\s*/, ""); // strip leading barcode
  description = description.replace(/[\s\-:*.]+$/, "").trim();

  if (!description || description.length < 2) return null;
  if (/^[^a-zA-Z]*$/.test(description)) return null; // no letters at all -> not a product description

  const unitPriceMinor = toMinorUnits(unitPriceValue.toFixed(2));
  // Guard against qty=0 producing a divide/line total mismatch downstream.
  if (qty <= 0) qty = 1;
  let lineTotalMinor = toMinorUnits(lineTotalValue.toFixed(2));
  // If unit price * qty was used to derive values, keep lineTotal as printed (source of truth from the receipt).

  // A real product line never costs nothing — this rejects stray digit runs
  // picked up from PINs, barcodes or reference numbers that slipped past the
  // metadata/summary filters above.
  if (unitPriceMinor === 0 && lineTotalMinor === 0) return null;

  return {
    rawLine: line,
    description,
    normalizedName: description,
    quantity: qty,
    unitPriceMinor,
    lineTotalMinor,
    categorySlug: guessCategorySlug(description),
    isUncertain,
    uncertainReason,
  };
}

export interface SummaryFields {
  subtotalMinor: number | null;
  discountMinor: number;
  taxMinor: number;
  printedTotalMinor: number | null;
}

export function extractSummaryFields(lines: string[]): SummaryFields {
  let subtotalMinor: number | null = null;
  let discountMinor = 0;
  let taxMinor = 0;
  let printedTotalMinor: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const numbers = extractNumberTokens(trimmed);
    const lastNumber = numbers[numbers.length - 1];
    if (!lastNumber) continue;
    const minor = toMinorUnits(lastNumber.value.toFixed(2));

    if (/^\s*sub\s?-?total\b/i.test(trimmed)) {
      subtotalMinor = minor;
    } else if (/\b(discount|disc|less)\b/i.test(trimmed) && !/\btotal\b/i.test(trimmed)) {
      discountMinor += Math.abs(minor);
    } else if (/\b(v\.?a\.?t\.?|tax)\b/i.test(trimmed) && !/\btotal\b/i.test(trimmed)) {
      taxMinor += Math.abs(minor);
    } else if (/\bgrand\s?total\b|\btotal\b(?!.*(sub|item|qty))/i.test(trimmed) && !/\bsub\b/i.test(trimmed)) {
      // Prefer the last "total"-labelled line encountered — the final printed total
      // on a receipt is usually the last of several "total"-ish lines.
      printedTotalMinor = minor;
    } else if (/\bamount\s?due\b/i.test(trimmed)) {
      printedTotalMinor = minor;
    }
  }

  return { subtotalMinor, discountMinor, taxMinor, printedTotalMinor };
}
