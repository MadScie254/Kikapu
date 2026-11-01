/**
 * Date helpers. Kikapu's default timezone is Africa/Nairobi (UTC+3, no DST),
 * so "today" / "this week" boundaries are computed against that offset
 * regardless of where the server or browser physically runs.
 */

export const DEFAULT_TIMEZONE = "Africa/Nairobi";
const NAIROBI_OFFSET_MINUTES = 3 * 60;

/** Returns a Date representing "now" shifted so that getUTC* fields read as Nairobi local time. */
export function nowInNairobi(): Date {
  const now = new Date();
  return new Date(now.getTime() + NAIROBI_OFFSET_MINUTES * 60_000);
}

export function toNairobi(date: Date): Date {
  return new Date(date.getTime() + NAIROBI_OFFSET_MINUTES * 60_000);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date: Date): Date {
  // Week starts Monday
  const d = startOfDay(date);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  return endOfDay(e);
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setUTCDate(1);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = startOfMonth(date);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return endOfDay(d);
}

export function startOfYear(date: Date): Date {
  const d = startOfDay(date);
  d.setUTCMonth(0, 1);
  return d;
}

export function endOfYear(date: Date): Date {
  const d = startOfYear(date);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(0);
  return endOfDay(d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatHumanDate(date: Date): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatHumanDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-KE", { month: "short", year: "numeric" }).format(date);
}

/**
 * Faded thermal-receipt OCR commonly confuses O/0, I/l/1 and S/5; but only
 * within short runs that are already mostly digits (e.g. "2O26", "O1"), so
 * real words are left untouched. Applied before date matching so a noisy
 * scan like "12-O1-2O26" still resolves to 2026-01-12.
 */
export function fixDateOcrNoise(text: string): string {
  return text.replace(/[0-9OoIlSs]{2,8}/g, (run) => {
    const digitCount = (run.match(/[0-9]/g) || []).length;
    const letterCount = (run.match(/[OoIlSs]/g) || []).length;
    if (letterCount === 0 || letterCount > digitCount) return run; // leave real words alone
    return run.replace(/[Oo]/g, "0").replace(/[Il]/g, "1").replace(/[Ss]/g, "5");
  });
}

/**
 * Parse common Kenyan receipt date formats found on thermal receipts:
 * DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, "12 Jan 2025", with
 * optional time attached (HH:MM or HH:MM:SS, 24h or with AM/PM).
 * Returns null if nothing plausible is found.
 */
export function parseReceiptDate(rawText: string, referenceNow: Date = new Date()): Date | null {
  const text = fixDateOcrNoise(rawText);
  const candidates: { date: Date; confidence: number }[] = [];

  // YYYY-MM-DD or YYYY/MM/DD
  for (const m of text.matchAll(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g)) {
    const [, y, mo, d] = m;
    const date = buildDate(+y, +mo, +d);
    if (date) candidates.push({ date, confidence: 0.9 });
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (day-month-year, common in Kenya)
  for (const m of text.matchAll(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2}|\d{2})\b/g)) {
    let [, d, mo, y] = m;
    let year = +y;
    if (year < 100) year += 2000;
    const date = buildDate(year, +mo, +d);
    if (date) candidates.push({ date, confidence: 0.85 });
  }

  // "12 Jan 2025" / "12 January 2025"
  const months =
    "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
  const monthRe = new RegExp(`\\b(\\d{1,2})\\s+(${months})[a-z]*\\s+(20\\d{2})\\b`, "gi");
  for (const m of text.matchAll(monthRe)) {
    const [, d, moStr, y] = m;
    const monthIndex = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ].indexOf(moStr.slice(0, 3).toLowerCase());
    if (monthIndex >= 0) {
      const date = buildDate(+y, monthIndex + 1, +d);
      if (date) candidates.push({ date, confidence: 0.95 });
    }
  }

  if (candidates.length === 0) return null;

  // Prefer dates that are not in the future and are reasonably recent (within 2 years),
  // and prefer higher-confidence patterns.
  const scored = candidates
    .map((c) => {
      const future = c.date.getTime() > referenceNow.getTime() + 24 * 3600_000;
      const ageDays = (referenceNow.getTime() - c.date.getTime()) / 86_400_000;
      const plausible = !future && ageDays >= -1 && ageDays <= 365 * 2;
      return { ...c, score: c.confidence + (plausible ? 1 : -1) };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0].date;
}

function buildDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/** Parse a time like "14:32" or "02:32 PM" found near a date on a receipt. */
export function parseReceiptTime(text: string): { hours: number; minutes: number } | null {
  const m = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
  if (!m) return null;
  let hours = +m[1];
  const minutes = +m[2];
  const meridiem = m[3]?.toLowerCase();
  if (hours > 23 || minutes > 59) return null;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}
