import { titleCase } from "./textNormalize.js";

const NON_MERCHANT_LINE_RE =
  /^(tel|phone|p\.?o\.?\s?box|pin|vat\s?no|till|address|location|email|www\.|http|receipt|invoice|cashier|served\s?by|date|time)\b/i;

const KNOWN_MERCHANTS: { match: RegExp; canonical: string }[] = [
  { match: /naivas/i, canonical: "Naivas Supermarket" },
  { match: /carrefour/i, canonical: "Carrefour" },
  { match: /quickmart/i, canonical: "QuickMart" },
  { match: /tuskys|tusker\s?mattress/i, canonical: "Tuskys" },
  { match: /chandarana/i, canonical: "Chandarana Foodplus" },
  { match: /\bshoprite\b/i, canonical: "Shoprite" },
  { match: /\bcleanshelf\b/i, canonical: "CleanShelf" },
  { match: /\bzucchini\b/i, canonical: "Zucchini" },
  { match: /\bgreenspan\b/i, canonical: "Greenspan Mall" },
  { match: /\bkhetias?\b/i, canonical: "Khetia's Supermarket" },
];

/** Look up a known Kenyan retailer by fuzzy match; returns null if not recognized. */
export function matchKnownMerchant(raw: string): string | null {
  for (const { match, canonical } of KNOWN_MERCHANTS) {
    if (match.test(raw)) return canonical;
  }
  return null;
}

/**
 * Merchant name is almost always one of the first few printed lines, in
 * larger/bolder font (which OCR usually renders as the first non-empty,
 * non-metadata line). We score the first 5 lines and take the best guess.
 */
export function parseMerchantName(lines: string[]): { name: string | null; confidence: "high" | "medium" | "low" } {
  const candidateLines = lines.slice(0, 6);

  for (const line of candidateLines) {
    const known = matchKnownMerchant(line);
    if (known) return { name: known, confidence: "high" };
  }

  for (const line of candidateLines) {
    if (line.length < 2) continue;
    if (NON_MERCHANT_LINE_RE.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[0-9\s\-./:]+$/.test(line)) continue; // pure numbers/dates/phones
    const letterRatio = (line.match(/[a-zA-Z]/g)?.length ?? 0) / line.length;
    if (letterRatio < 0.4) continue;
    return { name: titleCase(line), confidence: "medium" };
  }

  return { name: candidateLines[0] ? titleCase(candidateLines[0]) : null, confidence: "low" };
}

export function extractReceiptNumber(lines: string[]): string | null {
  for (const line of lines) {
    // Skip payment-method lines entirely; "M-PESA REF: XXXX" would otherwise
    // match the "ref" keyword below and get mistaken for the receipt number.
    if (/m[\-\s]?pesa|\bvisa\b|\bmastercard\b/i.test(line)) continue;
    const m = line.match(/\b(?:receipt|rcpt|inv(?:oice)?|ref|txn|trans(?:action)?)\s*[.#:no]*\s*[:#]?\s*([A-Z0-9\-\/]{4,20})\b/i);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/**
 * M-Pesa confirmation codes look like 10 uppercase alphanumeric chars, e.g.
 * QGH7X9K2L1; never a product price. Checked in priority order (M-Pesa,
 * then card, then cash) across ALL lines rather than stopping at whichever
 * keyword happens to appear first; a receipt can print "CASH TENDERED" /
 * "CHANGE" informationally even when the actual tender was M-Pesa, so a
 * single combined pass could miss the real payment method.
 */
export function extractMpesaCode(lines: string[]): { code: string | null; method: string | null } {
  let sawMpesa = false;
  for (const line of lines) {
    if (/m[\-\s]?pesa/i.test(line)) {
      sawMpesa = true;
      // A receipt often mentions M-Pesa on more than one line (e.g. "MPESA
      // PAY: 1,147.00" before the real "MPESA Trn #: UK1HL04YT2"); keep
      // scanning instead of stopping at whichever one has no code.
      const m = line.match(/\b([A-Z0-9]{8,12})\b/);
      if (m) return { code: m[1], method: "M-Pesa" };
    }
  }
  if (sawMpesa) return { code: null, method: "M-Pesa" };
  for (const line of lines) {
    if (/\bvisa\b|\bmastercard\b|\bcard\s*payment\b/i.test(line)) {
      return { code: null, method: "Card" };
    }
  }
  for (const line of lines) {
    if (/\bcash\b/i.test(line) && !/cashier/i.test(line)) {
      return { code: null, method: "Cash" };
    }
  }
  return { code: null, method: null };
}
