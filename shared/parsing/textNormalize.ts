/**
 * OCR output from thermal till receipts is noisy: broken spacing, confused
 * glyphs (O/0, I/1/l, S/5, B/8), and stray punctuation. These helpers clean
 * text up WITHOUT guessing content; they only fix character-level noise.
 */

/** Collapse repeated whitespace, strip control characters, trim each line. */
export function normalizeWhitespace(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();
}

export function splitLines(raw: string): string[] {
  return normalizeWhitespace(raw)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Fix digit-context OCR confusions INSIDE a token that is otherwise numeric,
 * e.g. "I8O.OO" -> "180.00", "S0.00" -> "50.00", "42O.OO" -> "420.00".
 *
 * Deliberately has NO "mostly real word" bail-out: its only caller,
 * extractNumberTokens, already restricts matches to the digit/confusable-
 * letter character class below via its own regex, so by construction a
 * token reaching this function can never be ordinary text; a heuristic
 * like "skip it if there are more letters than digits" would otherwise
 * misfire on exactly the receipts most worth fixing, where a faded "00"
 * fraction OCRs as "OO" and outnumbers a short integer part (e.g. "85.OO"
 * has two letters against one real digit, yet is unambiguously a price).
 */
export function fixNumericOcrNoise(token: string): string {
  if (!/^[0-9OoIlSsBbZz.,]+$/.test(token)) return token;
  if (!/[OoIlSsBbZz]/.test(token)) return token; // nothing to fix

  return token
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/[Zz]/g, "2");
}

/** Extract every numeric-looking token from a line, fixing OCR noise, as parsed floats with their raw match. */
export function extractNumberTokens(line: string): { raw: string; value: number; index: number }[] {
  const results: { raw: string; value: number; index: number }[] = [];
  // Matches things like 1,234.50 / 1234.50 / 1234 / 12.5
  const re = /[0-9OoIlSsBbZz]{1,3}(?:[,.][0-9OoIlSsBbZz]{2,3})*(?:\.[0-9OoIlSsBbZz]{1,2})?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const raw = m[0];
    if (!/\d/.test(raw)) continue;
    const fixed = fixNumericOcrNoise(raw).replace(/,/g, "");
    const value = parseFloat(fixed);
    if (!Number.isNaN(value)) {
      results.push({ raw, value, index: m.index });
    }
  }
  return results;
}

/** Normalize to Title Case while preserving ALLCAPS brand acronyms shorter than 4 chars. */
export function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      if (/^\d/.test(word)) return word; // keep sizes like "2kg" lowercase-ish as-is below
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** Strip common pack-size / unit suffixes so "COOKING OIL 2L" and "COOKING OIL 500ML" can be compared loosely. */
export function stripPackSize(name: string): string {
  return name
    .replace(/\b\d+(\.\d+)?\s?(kg|g|ml|l|ltr|ltrs|pcs|pc|pkt|pack)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** A loose key for fuzzy-matching product names across receipts (for suggesting aliases, never auto-merging). */
export function productFuzzyKey(name: string): string {
  return stripPackSize(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function merchantFuzzyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|supermarket|stores?|shop|kenya)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}
