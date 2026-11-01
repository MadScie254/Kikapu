import { describe, it, expect } from "vitest";
import { findPossibleDuplicate, type DuplicateCandidate } from "../../shared/parsing/duplicateDetection.js";

const existing: DuplicateCandidate[] = [
  { id: "r1", merchantNameRaw: "Naivas Supermarket", purchasedAt: "2026-11-12T18:42:00.000Z", totalMinor: 143500, itemCount: 5 },
  { id: "r2", merchantNameRaw: "Kawangware Market", purchasedAt: "2026-11-10T09:00:00.000Z", totalMinor: 19000, itemCount: 3 },
];

describe("findPossibleDuplicate", () => {
  it("flags a receipt with the same merchant, day, total and item count", () => {
    const match = findPossibleDuplicate(
      { merchantNameRaw: "NAIVAS LTD", purchasedAt: "2026-11-12T20:00:00.000Z", totalMinor: 143550, itemCount: 5 },
      existing
    );
    expect(match?.id).toBe("r1");
  });

  it("does not flag a different store on the same day for the same amount", () => {
    const match = findPossibleDuplicate(
      { merchantNameRaw: "QuickMart", purchasedAt: "2026-11-12T20:00:00.000Z", totalMinor: 143500, itemCount: 5 },
      existing
    );
    expect(match).toBeNull();
  });

  it("does not flag the same store on a different day", () => {
    const match = findPossibleDuplicate(
      { merchantNameRaw: "Naivas Supermarket", purchasedAt: "2026-11-13T18:42:00.000Z", totalMinor: 143500, itemCount: 5 },
      existing
    );
    expect(match).toBeNull();
  });

  it("does not flag a legitimately different purchase (different item count) at the same store on the same day", () => {
    const match = findPossibleDuplicate(
      { merchantNameRaw: "Naivas Supermarket", purchasedAt: "2026-11-12T08:00:00.000Z", totalMinor: 143500, itemCount: 2 },
      existing
    );
    expect(match).toBeNull();
  });

  it("tolerates a sub-1-KES rounding difference in total", () => {
    const match = findPossibleDuplicate(
      { merchantNameRaw: "Naivas Supermarket", purchasedAt: "2026-11-12T08:00:00.000Z", totalMinor: 143499, itemCount: 5 },
      existing
    );
    expect(match?.id).toBe("r1");
  });
});
