import { merchantFuzzyKey } from "./textNormalize.js";

export interface DuplicateCandidate {
  id: string;
  merchantNameRaw: string;
  purchasedAt: string; // ISO
  totalMinor: number;
  itemCount: number;
}

export interface DuplicateCheckInput {
  merchantNameRaw: string;
  purchasedAt: string;
  totalMinor: number;
  itemCount: number;
}

/**
 * Basic duplicate heuristic: a transaction is flagged as a *possible*
 * duplicate (never auto-rejected) when an existing receipt from the same
 * household shares the same merchant (fuzzy-matched), the same calendar day,
 * a total within 1 KES, and the same number of line items.
 *
 * This is a metadata-based heuristic, not an image perceptual hash; two
 * genuinely separate receipts from the same store on the same day for the
 * same amount (e.g. buying the same top-up twice) can still trigger it.
 * That's why it only ever warns; the user decides.
 */
export function findPossibleDuplicate(
  candidate: DuplicateCheckInput,
  existing: DuplicateCandidate[]
): DuplicateCandidate | null {
  const candidateKey = merchantFuzzyKey(candidate.merchantNameRaw);
  const candidateDay = candidate.purchasedAt.slice(0, 10);

  for (const e of existing) {
    const sameMerchant = merchantFuzzyKey(e.merchantNameRaw) === candidateKey;
    const sameDay = e.purchasedAt.slice(0, 10) === candidateDay;
    const sameTotal = Math.abs(e.totalMinor - candidate.totalMinor) <= 100;
    const sameItemCount = e.itemCount === candidate.itemCount;
    if (sameMerchant && sameDay && sameTotal && sameItemCount) {
      return e;
    }
  }
  return null;
}
