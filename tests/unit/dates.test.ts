import { describe, it, expect } from "vitest";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  parseReceiptDate,
  parseReceiptTime,
  isSameDay,
  formatISODate,
} from "../../shared/dates.js";

describe("day/week/month boundaries", () => {
  it("startOfDay zeroes the time", () => {
    const d = startOfDay(new Date("2026-11-15T18:42:00Z"));
    expect(formatISODate(d)).toBe("2026-11-15");
  });

  it("startOfWeek always lands on Monday", () => {
    const wed = new Date("2026-11-18T12:00:00Z"); // a Wednesday
    const monday = startOfWeek(wed);
    expect(monday.getUTCDay()).toBe(1);
    expect(formatISODate(monday)).toBe("2026-11-16");
  });

  it("startOfMonth / endOfMonth bracket the whole month", () => {
    const d = new Date("2026-02-14T00:00:00Z");
    expect(formatISODate(startOfMonth(d))).toBe("2026-02-01");
    expect(formatISODate(endOfMonth(d))).toBe("2026-02-28"); // 2026 is not a leap year
  });

  it("isSameDay ignores time-of-day", () => {
    expect(isSameDay(new Date("2026-01-01T01:00:00Z"), new Date("2026-01-01T23:00:00Z"))).toBe(true);
    expect(isSameDay(new Date("2026-01-01T23:59:00Z"), new Date("2026-01-02T00:01:00Z"))).toBe(false);
  });
});

describe("parseReceiptDate", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("parses DD/MM/YYYY (common on Kenyan receipts)", () => {
    const d = parseReceiptDate("12/11/2026  18:42", now);
    expect(d).not.toBeNull();
    expect(formatISODate(d!)).toBe("2026-11-12");
  });

  it("parses YYYY-MM-DD", () => {
    const d = parseReceiptDate("Date: 2026-11-18", now);
    expect(formatISODate(d!)).toBe("2026-11-18");
  });

  it("parses '12 Jan 2026' style dates", () => {
    const d = parseReceiptDate("12 Jan 2026", now);
    expect(formatISODate(d!)).toBe("2026-01-12");
  });

  it("prefers a plausible recent date over a future-dated false match", () => {
    const text = "SOME CODE 31/12/2099\nTXN DATE 15/11/2026";
    const d = parseReceiptDate(text, now);
    expect(formatISODate(d!)).toBe("2026-11-15");
  });

  it("returns null when nothing date-like is present", () => {
    expect(parseReceiptDate("COOKING OIL 650.00", now)).toBeNull();
  });
});

describe("parseReceiptTime", () => {
  it("parses 24h time", () => {
    expect(parseReceiptTime("18:42")).toEqual({ hours: 18, minutes: 42 });
  });

  it("parses 12h time with AM/PM", () => {
    expect(parseReceiptTime("6:42 PM")).toEqual({ hours: 18, minutes: 42 });
    expect(parseReceiptTime("12:00 AM")).toEqual({ hours: 0, minutes: 0 });
  });

  it("returns null for invalid time", () => {
    expect(parseReceiptTime("no time here")).toBeNull();
  });
});
