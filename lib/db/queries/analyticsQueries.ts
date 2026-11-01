import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";
import { ratio } from "../../../shared/money.js";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  formatISODate,
} from "../../../shared/dates.js";
import type { AnalyticsSummary } from "../../../shared/types.js";

export async function computeAnalyticsSummary(
  db: Database,
  householdId: string,
  range: { start: Date; end: Date },
  monthlyBudgetMinor: number | null,
  now: Date = new Date()
): Promise<AnalyticsSummary> {
  const inRange = and(
    eq(schema.receipts.householdId, householdId),
    gte(schema.receipts.purchasedAt, range.start),
    lte(schema.receipts.purchasedAt, range.end)
  );

  const [totals] = await db
    .select({
      totalMinor: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.receipts)
    .where(inRange);

  const todayRange = { start: startOfDay(now), end: endOfDay(now) };
  const weekRange = { start: startOfWeek(now), end: endOfWeek(now) };
  const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };

  const [todayRow] = await db
    .select({ s: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int` })
    .from(schema.receipts)
    .where(
      and(
        eq(schema.receipts.householdId, householdId),
        gte(schema.receipts.purchasedAt, todayRange.start),
        lte(schema.receipts.purchasedAt, todayRange.end)
      )
    );
  const [weekRow] = await db
    .select({ s: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int` })
    .from(schema.receipts)
    .where(
      and(
        eq(schema.receipts.householdId, householdId),
        gte(schema.receipts.purchasedAt, weekRange.start),
        lte(schema.receipts.purchasedAt, weekRange.end)
      )
    );
  const [monthRow] = await db
    .select({ s: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int` })
    .from(schema.receipts)
    .where(
      and(
        eq(schema.receipts.householdId, householdId),
        gte(schema.receipts.purchasedAt, monthRange.start),
        lte(schema.receipts.purchasedAt, monthRange.end)
      )
    );

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(${schema.receipts.purchasedAt}, 'YYYY-MM-DD')`,
      s: sql<number>`sum(${schema.receipts.totalMinor})::int`,
    })
    .from(schema.receipts)
    .where(inRange)
    .groupBy(sql`to_char(${schema.receipts.purchasedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${schema.receipts.purchasedAt}, 'YYYY-MM-DD')`);

  const categoryRows = await db
    .select({
      categoryId: schema.categories.id,
      categoryName: schema.categories.name,
      color: schema.categories.color,
      total: sql<number>`sum(${schema.receiptItems.lineTotalMinor})::int`,
    })
    .from(schema.receiptItems)
    .innerJoin(schema.receipts, eq(schema.receiptItems.receiptId, schema.receipts.id))
    .leftJoin(schema.categories, eq(schema.receiptItems.categoryId, schema.categories.id))
    .where(and(inRange, sql`${schema.categories.isOverall} is not true`))
    .groupBy(schema.categories.id, schema.categories.name, schema.categories.color)
    .orderBy(sql`sum(${schema.receiptItems.lineTotalMinor}) desc`);

  const topProductRows = await db
    .select({
      productName: schema.receiptItems.normalizedName,
      total: sql<number>`sum(${schema.receiptItems.lineTotalMinor})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.receiptItems)
    .innerJoin(schema.receipts, eq(schema.receiptItems.receiptId, schema.receipts.id))
    .where(inRange)
    .groupBy(schema.receiptItems.normalizedName)
    .orderBy(sql`sum(${schema.receiptItems.lineTotalMinor}) desc`)
    .limit(10);

  const storeRows = await db
    .select({
      merchantName: schema.receipts.merchantNameRaw,
      total: sql<number>`sum(${schema.receipts.totalMinor})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.receipts)
    .where(inRange)
    .groupBy(schema.receipts.merchantNameRaw)
    .orderBy(sql`sum(${schema.receipts.totalMinor}) desc`)
    .limit(10);

  return {
    periodStart: range.start.toISOString(),
    periodEnd: range.end.toISOString(),
    totalSpentMinor: totals?.totalMinor ?? 0,
    todaySpentMinor: todayRow?.s ?? 0,
    weekSpentMinor: weekRow?.s ?? 0,
    monthSpentMinor: monthRow?.s ?? 0,
    receiptCount: totals?.count ?? 0,
    averageTransactionMinor: totals?.count ? Math.round(totals.totalMinor / totals.count) : 0,
    monthlyBudgetMinor,
    monthlyBudgetUsedRatio: monthlyBudgetMinor ? ratio(monthRow?.s ?? 0, monthlyBudgetMinor) : null,
    dailyTrend: dailyRows.map((r) => ({ date: r.day, totalMinor: r.s })),
    categoryBreakdown: categoryRows
      .filter((r) => r.categoryId)
      .map((r) => ({
        categoryId: r.categoryId as string,
        categoryName: r.categoryName ?? "Uncategorized",
        color: r.color ?? "#94A3B8",
        totalMinor: r.total,
      })),
    topProducts: topProductRows.map((r) => ({
      productName: r.productName,
      totalMinor: r.total,
      purchaseCount: r.count,
    })),
    storeBreakdown: storeRows.map((r) => ({
      merchantName: r.merchantName,
      totalMinor: r.total,
      visitCount: r.count,
    })),
  };
}
