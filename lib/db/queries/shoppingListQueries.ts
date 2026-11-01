import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";

export async function listShoppingLists(db: Database, householdId: string) {
  const lists = await db
    .select()
    .from(schema.shoppingLists)
    .where(eq(schema.shoppingLists.householdId, householdId))
    .orderBy(desc(schema.shoppingLists.createdAt));

  const counts = lists.length
    ? await db
        .select({
          listId: schema.shoppingListItems.shoppingListId,
          total: sql<number>`count(*)::int`,
          purchased: sql<number>`count(*) filter (where ${schema.shoppingListItems.purchased})::int`,
          estimatedMinor: sql<number>`coalesce(sum(${schema.shoppingListItems.estimatedPriceMinor} * ${schema.shoppingListItems.quantity}), 0)::int`,
        })
        .from(schema.shoppingListItems)
        .where(inArray(schema.shoppingListItems.shoppingListId, lists.map((l) => l.id)))
        .groupBy(schema.shoppingListItems.shoppingListId)
    : [];
  const byId = new Map(counts.map((c) => [c.listId, c]));

  return lists.map((l) => ({
    ...l,
    itemCount: byId.get(l.id)?.total ?? 0,
    purchasedCount: byId.get(l.id)?.purchased ?? 0,
    estimatedTotalMinor: byId.get(l.id)?.estimatedMinor ?? 0,
  }));
}

export async function getShoppingListById(db: Database, householdId: string, id: string) {
  const [list] = await db
    .select()
    .from(schema.shoppingLists)
    .where(and(eq(schema.shoppingLists.id, id), eq(schema.shoppingLists.householdId, householdId)))
    .limit(1);
  if (!list) return null;

  const items = await db
    .select()
    .from(schema.shoppingListItems)
    .where(eq(schema.shoppingListItems.shoppingListId, id))
    .orderBy(asc(schema.shoppingListItems.sortOrder));

  return { ...list, items };
}

/** Looks up the most recent price paid for a similarly-named product, for shopping-list cost estimates. */
export async function estimatePriceForItemName(db: Database, householdId: string, name: string): Promise<number | null> {
  const [row] = await db
    .select({ unitPriceMinor: schema.receiptItems.unitPriceMinor })
    .from(schema.receiptItems)
    .innerJoin(schema.receipts, eq(schema.receiptItems.receiptId, schema.receipts.id))
    .where(and(eq(schema.receipts.householdId, householdId), ilike(schema.receiptItems.normalizedName, `%${name}%`)))
    .orderBy(desc(schema.receipts.purchasedAt))
    .limit(1);
  return row?.unitPriceMinor ?? null;
}

export async function createShoppingList(db: Database, householdId: string, userId: string, name: string) {
  const [list] = await db.insert(schema.shoppingLists).values({ householdId, name, createdByUserId: userId }).returning();
  return list;
}

export async function updateShoppingList(
  db: Database,
  householdId: string,
  id: string,
  input: { name?: string; completed?: boolean }
) {
  const existing = await getShoppingListById(db, householdId, id);
  if (!existing) return null;
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.completed !== undefined) updates.completedAt = input.completed ? new Date() : null;
  const [updated] = await db.update(schema.shoppingLists).set(updates).where(eq(schema.shoppingLists.id, id)).returning();
  return updated;
}

export async function deleteShoppingList(db: Database, householdId: string, id: string) {
  const existing = await getShoppingListById(db, householdId, id);
  if (!existing) return null;
  await db.delete(schema.shoppingLists).where(eq(schema.shoppingLists.id, id));
  return existing;
}

export async function addShoppingListItem(
  db: Database,
  listId: string,
  input: { name: string; quantity: number; estimatedPriceMinor: number | null; estimateSource: "historical" | "manual" | "none" }
) {
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${schema.shoppingListItems.sortOrder}), -1)::int` })
    .from(schema.shoppingListItems)
    .where(eq(schema.shoppingListItems.shoppingListId, listId));

  const [item] = await db
    .insert(schema.shoppingListItems)
    .values({
      shoppingListId: listId,
      name: input.name,
      quantity: String(input.quantity),
      estimatedPriceMinor: input.estimatedPriceMinor,
      estimateSource: input.estimateSource,
      sortOrder: maxOrder + 1,
    })
    .returning();
  return item;
}

export async function updateShoppingListItem(
  db: Database,
  itemId: string,
  input: { name?: string; quantity?: number; estimatedPriceMinor?: number | null; purchased?: boolean }
) {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.quantity !== undefined) updates.quantity = String(input.quantity);
  if (input.estimatedPriceMinor !== undefined) {
    updates.estimatedPriceMinor = input.estimatedPriceMinor;
    updates.estimateSource = "manual";
  }
  if (input.purchased !== undefined) updates.purchased = input.purchased;
  const [updated] = await db.update(schema.shoppingListItems).set(updates).where(eq(schema.shoppingListItems.id, itemId)).returning();
  return updated;
}

export async function deleteShoppingListItem(db: Database, itemId: string) {
  await db.delete(schema.shoppingListItems).where(eq(schema.shoppingListItems.id, itemId));
}
