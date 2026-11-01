import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";

/** Cross-household stats; admin-only, bypasses the usual single-household ownership scoping. */
export async function getAdminOverview(db: Database) {
  const [[userCount], [householdCount], [receiptCount], [totals]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(sql`${schema.users.deletedAt} is null`),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.households),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.receipts),
    db
      .select({ totalSpentMinor: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int` })
      .from(schema.receipts),
  ]);

  return {
    userCount: userCount.count,
    householdCount: householdCount.count,
    receiptCount: receiptCount.count,
    totalSpentMinor: totals.totalSpentMinor,
  };
}

export async function listHouseholdsForAdmin(db: Database) {
  const rows = await db
    .select({
      householdId: schema.households.id,
      name: schema.households.name,
      currency: schema.households.currency,
      createdAt: schema.households.createdAt,
      ownerEmail: schema.users.email,
      ownerDisplayName: schema.users.displayName,
    })
    .from(schema.households)
    .leftJoin(schema.users, eq(schema.households.createdByUserId, schema.users.id))
    .orderBy(desc(schema.households.createdAt));

  const receiptStats = await db
    .select({
      householdId: schema.receipts.householdId,
      receiptCount: sql<number>`count(*)::int`,
      totalSpentMinor: sql<number>`coalesce(sum(${schema.receipts.totalMinor}), 0)::int`,
      lastReceiptAt: sql<string | null>`max(${schema.receipts.purchasedAt})`,
    })
    .from(schema.receipts)
    .groupBy(schema.receipts.householdId);

  const statsByHousehold = new Map(receiptStats.map((s) => [s.householdId, s]));

  return rows.map((h) => {
    const stats = statsByHousehold.get(h.householdId);
    return {
      householdId: h.householdId,
      name: h.name,
      currency: h.currency,
      createdAt: h.createdAt.toISOString(),
      ownerEmail: h.ownerEmail,
      ownerDisplayName: h.ownerDisplayName,
      receiptCount: stats?.receiptCount ?? 0,
      totalSpentMinor: stats?.totalSpentMinor ?? 0,
      lastReceiptAt: stats?.lastReceiptAt ?? null,
    };
  });
}

export async function getHouseholdDetailForAdmin(db: Database, householdId: string) {
  const [household] = await db.select().from(schema.households).where(eq(schema.households.id, householdId)).limit(1);
  if (!household) return null;

  const members = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.householdMembers.role,
      joinedAt: schema.householdMembers.joinedAt,
    })
    .from(schema.householdMembers)
    .innerJoin(schema.users, eq(schema.householdMembers.userId, schema.users.id))
    .where(eq(schema.householdMembers.householdId, householdId));

  const recentReceipts = await db
    .select({
      id: schema.receipts.id,
      merchantNameRaw: schema.receipts.merchantNameRaw,
      totalMinor: schema.receipts.totalMinor,
      purchasedAt: schema.receipts.purchasedAt,
    })
    .from(schema.receipts)
    .where(eq(schema.receipts.householdId, householdId))
    .orderBy(desc(schema.receipts.purchasedAt))
    .limit(20);

  return {
    household: {
      id: household.id,
      name: household.name,
      currency: household.currency,
      monthlyBudgetMinor: household.monthlyBudgetMinor,
      createdAt: household.createdAt.toISOString(),
    },
    members: members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
    recentReceipts: recentReceipts.map((r) => ({
      id: r.id,
      merchantNameRaw: r.merchantNameRaw,
      totalMinor: r.totalMinor,
      purchasedAt: r.purchasedAt.toISOString(),
    })),
  };
}

export async function promoteUserToAdmin(db: Database, email: string): Promise<{ id: string; email: string } | null> {
  const [user] = await db
    .update(schema.users)
    .set({ role: "admin" })
    .where(eq(schema.users.email, email))
    .returning({ id: schema.users.id, email: schema.users.email });
  return user ?? null;
}
