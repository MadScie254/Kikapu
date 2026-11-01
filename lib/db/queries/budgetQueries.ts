import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";

export async function listBudgetsForPeriod(db: Database, householdId: string, periodMonth: string) {
  const rows = await db
    .select({
      id: schema.budgets.id,
      categoryId: schema.budgets.categoryId,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
      isOverall: schema.categories.isOverall,
      periodMonth: schema.budgets.periodMonth,
      amountMinor: schema.budgets.amountMinor,
      spentMinor: sql<number>`coalesce((
        select sum(ri.line_total_minor)
        from receipt_items ri
        inner join receipts r on r.id = ri.receipt_id
        where r.household_id = ${householdId}
          and (${schema.categories.isOverall} = true or ri.category_id = ${schema.budgets.categoryId})
          and to_char(r.purchased_at, 'YYYY-MM') = ${periodMonth}
      ), 0)::int`,
    })
    .from(schema.budgets)
    .innerJoin(schema.categories, eq(schema.budgets.categoryId, schema.categories.id))
    .where(and(eq(schema.budgets.householdId, householdId), eq(schema.budgets.periodMonth, periodMonth)));

  return rows;
}

export async function upsertBudget(
  db: Database,
  householdId: string,
  input: { categoryId: string; periodMonth: string; amountMinor: number }
) {
  const [existing] = await db
    .select()
    .from(schema.budgets)
    .where(
      and(
        eq(schema.budgets.householdId, householdId),
        eq(schema.budgets.categoryId, input.categoryId),
        eq(schema.budgets.periodMonth, input.periodMonth)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(schema.budgets)
      .set({ amountMinor: input.amountMinor, updatedAt: new Date() })
      .where(eq(schema.budgets.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(schema.budgets)
    .values({ householdId, categoryId: input.categoryId, periodMonth: input.periodMonth, amountMinor: input.amountMinor })
    .returning();
  return created;
}

export async function deleteBudget(db: Database, householdId: string, id: string) {
  const [existing] = await db
    .select()
    .from(schema.budgets)
    .where(and(eq(schema.budgets.id, id), eq(schema.budgets.householdId, householdId)))
    .limit(1);
  if (!existing) return null;
  await db.delete(schema.budgets).where(eq(schema.budgets.id, id));
  return existing;
}

export async function getBudgetHistory(db: Database, householdId: string, categoryId: string, limit = 6) {
  return db
    .select()
    .from(schema.budgets)
    .where(and(eq(schema.budgets.householdId, householdId), eq(schema.budgets.categoryId, categoryId)))
    .orderBy(desc(schema.budgets.periodMonth))
    .limit(limit);
}
