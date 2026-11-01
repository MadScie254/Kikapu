import { splitLines } from "./textNormalize.js";
import { parseMerchantName, extractReceiptNumber, extractMpesaCode } from "./merchantParser.js";
import { parseLineItem, isSummaryLine, isMetadataLine, extractSummaryFields } from "./lineItemParser.js";
import { parseReceiptDate, parseReceiptTime } from "../dates.js";
import { addMoney, subtractMoney } from "../money.js";
import type { ParsedReceiptResult } from "./types.js";

/**
 * Deterministic receipt parser. No AI, no network calls; pure text
 * analysis of raw OCR output. Designed to be run entirely in the browser
 * immediately after Tesseract.js produces text, so the user sees a filled
 * verification form instantly.
 *
 * This is intentionally conservative: when something is ambiguous it marks
 * the field uncertain and leans on the human reviewer rather than guessing
 * silently. See shared/parsing/README.md for the heuristics documented in
 * full.
 */
export function parseReceiptText(rawText: string, now: Date = new Date()): ParsedReceiptResult {
  const lines = splitLines(rawText);
  const warnings: string[] = [];

  const merchant = parseMerchantName(lines);
  const receiptNumber = extractReceiptNumber(lines);
  const { code: mpesaCode, method: paymentMethod } = extractMpesaCode(lines);

  let purchasedAt: Date | null = null;
  let dateConfidence: ParsedReceiptResult["dateConfidence"] = "none";
  for (const line of lines) {
    const d = parseReceiptDate(line, now);
    if (d) {
      const t = parseReceiptTime(line);
      if (t) d.setUTCHours(t.hours, t.minutes, 0, 0);
      purchasedAt = d;
      dateConfidence = t ? "high" : "medium";
      break;
    }
  }
  if (!purchasedAt) {
    const wholeTextDate = parseReceiptDate(rawText, now);
    if (wholeTextDate) {
      purchasedAt = wholeTextDate;
      dateConfidence = "low";
    } else {
      warnings.push("Couldn't find a date on this receipt, please enter it manually.");
    }
  }

  const items = [];
  for (const line of lines) {
    if (isSummaryLine(line) || isMetadataLine(line)) continue;
    const item = parseLineItem(line);
    if (item) items.push(item);
  }

  if (items.length === 0) {
    warnings.push("Couldn't identify any product lines automatically, you can add items manually below.");
  }

  const { subtotalMinor, discountMinor, taxMinor, printedTotalMinor } = extractSummaryFields(lines);
  const lineItemsSumMinor = addMoney(...items.map((i) => i.lineTotalMinor));

  // Decide whether VAT/tax shown on the receipt is already included in the
  // item totals (common on Kenyan supermarket receipts, which print
  // VAT-inclusive shelf prices) or charged additively on top of the subtotal.
  const base = subtractMoney(subtotalMinor ?? lineItemsSumMinor, discountMinor);
  const additiveTotal = addMoney(base, taxMinor);
  const inclusiveTotal = base;

  let taxMode: ParsedReceiptResult["taxMode"] = "unknown";
  let computedTotalMinor = inclusiveTotal;

  if (printedTotalMinor != null && taxMinor > 0) {
    const additiveDiff = Math.abs(subtractMoney(printedTotalMinor, additiveTotal));
    const inclusiveDiff = Math.abs(subtractMoney(printedTotalMinor, inclusiveTotal));
    if (additiveDiff <= inclusiveDiff) {
      taxMode = "additive";
      computedTotalMinor = additiveTotal;
    } else {
      taxMode = "inclusive";
      computedTotalMinor = inclusiveTotal;
    }
  } else if (taxMinor > 0) {
    taxMode = "inclusive";
    computedTotalMinor = inclusiveTotal;
  } else {
    computedTotalMinor = base;
  }

  const totalDiscrepancyMinor =
    printedTotalMinor != null ? subtractMoney(printedTotalMinor, computedTotalMinor) : 0;
  const totalMatches = printedTotalMinor == null || Math.abs(totalDiscrepancyMinor) <= 100;

  if (printedTotalMinor != null && !totalMatches) {
    warnings.push(
      `The printed total doesn't match the line items by about ${(Math.abs(totalDiscrepancyMinor) / 100).toFixed(2)}. Please check the amounts.`
    );
  }

  return {
    merchantNameRaw: merchant.name,
    merchantConfidence: merchant.confidence,
    purchasedAt,
    dateConfidence,
    receiptNumber,
    paymentMethod,
    mpesaCode,
    items,
    subtotalMinor,
    discountMinor,
    taxMinor,
    taxMode,
    printedTotalMinor,
    lineItemsSumMinor,
    computedTotalMinor,
    totalDiscrepancyMinor,
    totalMatches,
    warnings,
    rawText,
  };
}
