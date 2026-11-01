import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";

export async function listStores(db: Database, householdId: string) {
  const rows = await db
    .select({
      merchantId: schema.merchants.id,
      name: schema.merchants.name,
      location: schema.merchants.location,
      totalSpentMinor: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int`,
      visitCount: sql<number>`count(${schema.receipts.id})::int`,
      lastVisit: sql<string>`max(${schema.receipts.purchasedAt})`,
    })
    .from(schema.merchants)
    .leftJoin(schema.receipts, eq(schema.receipts.merchantId, schema.merchants.id))
    .where(eq(schema.merchants.householdId, householdId))
    .groupBy(schema.merchants.id, schema.merchants.name, schema.merchants.location)
    .orderBy(desc(sql`coalesce(sum(${schema.receipts.totalMinor}), 0)`));

  return rows;
}

/**
 * Historical unit prices for a product across stores and time, plus which
 * recorded store has shown the lowest price. Explicitly "historical"; this
 * reflects what was PAID in the past, never a live/current store price.
 */
export async function getProductPriceHistory(db: Database, householdId: string, productNameQuery: string) {
  const pattern = `%${productNameQuery}%`;
  const rows = await db
    .select({
      merchantName: schema.receipts.merchantNameRaw,
      unitPriceMinor: schema.receiptItems.unitPriceMinor,
      purchasedAt: schema.receipts.purchasedAt,
      description: schema.receiptItems.rawDescription,
    })
    .from(schema.receiptItems)
    .innerJoin(schema.receipts, eq(schema.receiptItems.receiptId, schema.receipts.id))
    .where(and(eq(schema.receipts.householdId, householdId), sql`${schema.receiptItems.normalizedName} ilike ${pattern}`))
    .orderBy(desc(schema.receipts.purchasedAt))
    .limit(50);

  if (rows.length === 0) {
    return { history: [], cheapestStore: null, mostRecentPriceMinor: null };
  }

  const byStore = new Map<string, number>();
  for (const r of rows) {
    const current = byStore.get(r.merchantName);
    if (current === undefined || r.unitPriceMinor < current) byStore.set(r.merchantName, r.unitPriceMinor);
  }
  const cheapest = [...byStore.entries()].sort((a, b) => a[1] - b[1])[0];

  return {
    history: rows.map((r) => ({
      merchantName: r.merchantName,
      unitPriceMinor: r.unitPriceMinor,
      purchasedAt: r.purchasedAt.toISOString(),
      description: r.description,
    })),
    cheapestStore: cheapest ? { merchantName: cheapest[0], unitPriceMinor: cheapest[1] } : null,
    mostRecentPriceMinor: rows[0].unitPriceMinor,
  };
}
