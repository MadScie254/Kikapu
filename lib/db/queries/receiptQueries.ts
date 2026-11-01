import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";
import { merchantFuzzyKey } from "../../../shared/parsing/textNormalize.js";
import { findPossibleDuplicate, type DuplicateCandidate } from "../../../shared/parsing/duplicateDetection.js";
import { addMoney, subtractMoney } from "../../../shared/money.js";
import type { ReceiptInput } from "../../../shared/validation/schemas.js";
import { resolveBlobUrl } from "../../blob.js";

export async function findOrCreateMerchant(db: Database, householdId: string, rawName: string) {
  const key = merchantFuzzyKey(rawName);
  if (!key) return null;
  const [existing] = await db
    .select()
    .from(schema.merchants)
    .where(and(eq(schema.merchants.householdId, householdId), eq(schema.merchants.normalizedName, key)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(schema.merchants)
    .values({ householdId, name: rawName.trim(), normalizedName: key })
    .returning();
  return created;
}

export async function findOrCreateProduct(
  db: Database,
  householdId: string,
  canonicalName: string,
  categoryId: string | null
) {
  const name = canonicalName.trim();
  const [existing] = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.householdId, householdId), eq(schema.products.canonicalName, name)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db.insert(schema.products).values({ householdId, canonicalName: name, categoryId }).returning();
  return created;
}

async function recentDuplicateCandidates(db: Database, householdId: string, around: Date): Promise<DuplicateCandidate[]> {
  const from = new Date(around.getTime() - 3 * 86_400_000);
  const to = new Date(around.getTime() + 3 * 86_400_000);
  const rows = await db
    .select({
      id: schema.receipts.id,
      merchantNameRaw: schema.receipts.merchantNameRaw,
      purchasedAt: schema.receipts.purchasedAt,
      totalMinor: schema.receipts.totalMinor,
    })
    .from(schema.receipts)
    .where(and(eq(schema.receipts.householdId, householdId), gte(schema.receipts.purchasedAt, from), lte(schema.receipts.purchasedAt, to)));

  if (rows.length === 0) return [];

  const receiptIds = rows.map((r) => r.id);
  const counts = await db
    .select({ receiptId: schema.receiptItems.receiptId, n: sql<number>`count(*)::int` })
    .from(schema.receiptItems)
    .where(inArray(schema.receiptItems.receiptId, receiptIds))
    .groupBy(schema.receiptItems.receiptId);
  const countById = new Map(counts.map((c) => [c.receiptId, c.n]));

  return rows.map((r) => ({
    id: r.id,
    merchantNameRaw: r.merchantNameRaw,
    purchasedAt: r.purchasedAt.toISOString(),
    totalMinor: r.totalMinor,
    itemCount: countById.get(r.id) ?? 0,
  }));
}

export async function checkForDuplicate(db: Database, householdId: string, input: ReceiptInput) {
  const candidates = await recentDuplicateCandidates(db, householdId, new Date(input.purchasedAt));
  return findPossibleDuplicate(
    {
      merchantNameRaw: input.merchantNameRaw,
      purchasedAt: input.purchasedAt,
      totalMinor: input.totalMinor,
      itemCount: input.items.length,
    },
    candidates
  );
}

export async function createReceipt(db: Database, householdId: string, userId: string, input: ReceiptInput) {
  const merchant = await findOrCreateMerchant(db, householdId, input.merchantNameRaw);

  // Resolve/auto-create products for each item BEFORE the transaction; these
  // are idempotent lookups-or-creates and keep the transaction itself small
  // and free of interdependent round trips (a neon-http constraint).
  const itemsWithProducts = await Promise.all(
    input.items.map(async (item) => {
      const product = await findOrCreateProduct(db, householdId, item.normalizedName ?? item.rawDescription, item.categoryId ?? null);
      return { ...item, productId: product.id };
    })
  );

  const receiptId = randomUUID();
  const subtotalMinor = input.subtotalMinor;
  const totalDiscrepancyMinor = input.printedTotalMinor != null ? subtractMoney(input.printedTotalMinor, input.totalMinor) : 0;

  const imageUrl = input.imageBlobPath ? await resolveBlobUrl(input.imageBlobPath) : null;

  // drizzle-orm/neon-http (Neon's stateless HTTP driver, used here so every
  // serverless invocation can run a query with no connection setup cost)
  // does NOT support SQL transactions at all — db.transaction() throws
  // immediately ("No transactions support in neon-http driver"). These two
  // inserts run sequentially instead; a receipt without its items (if the
  // second insert fails right after the first succeeds) is the accepted
  // tradeoff of this driver, not a risk this app can fully eliminate
  // without switching to Neon's pooled/websocket driver.
  await db.insert(schema.receipts).values({
    id: receiptId,
    householdId,
    merchantId: merchant?.id ?? null,
    merchantNameRaw: input.merchantNameRaw,
    purchasedAt: new Date(input.purchasedAt),
    receiptNumber: input.receiptNumber ?? null,
    subtotalMinor,
    discountMinor: input.discountMinor,
    taxMinor: input.taxMinor,
    otherChargesMinor: input.otherChargesMinor,
    totalMinor: input.totalMinor,
    printedTotalMinor: input.printedTotalMinor ?? null,
    totalDiscrepancyMinor,
    paymentMethod: input.paymentMethod ?? null,
    source: input.source,
    notes: input.notes ?? null,
    rawOcrText: input.rawOcrText ?? null,
    imageUrl,
    imageBlobPath: input.imageBlobPath ?? null,
    shoppingListId: input.shoppingListId ?? null,
    duplicateAcknowledged: input.acknowledgeDuplicate ?? false,
    createdByUserId: userId,
  });

  await db.insert(schema.receiptItems).values(
    itemsWithProducts.map((item, idx) => ({
      receiptId,
      productId: item.productId,
      rawDescription: item.rawDescription,
      normalizedName: item.normalizedName ?? item.rawDescription,
      quantity: String(item.quantity),
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
      categoryId: item.categoryId ?? null,
      isUncertain: item.isUncertain ?? false,
      sortOrder: idx,
    }))
  );

  return getReceiptById(db, householdId, receiptId);
}

export async function getReceiptById(db: Database, householdId: string, id: string) {
  const [receipt] = await db
    .select()
    .from(schema.receipts)
    .where(and(eq(schema.receipts.id, id), eq(schema.receipts.householdId, householdId)))
    .limit(1);
  if (!receipt) return null;

  const items = await db
    .select()
    .from(schema.receiptItems)
    .where(eq(schema.receiptItems.receiptId, id))
    .orderBy(asc(schema.receiptItems.sortOrder));

  return { ...receipt, items };
}

export interface ListReceiptsFilters {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  page: number;
  pageSize: number;
}

export async function listReceipts(db: Database, householdId: string, filters: ListReceiptsFilters) {
  const conditions = [eq(schema.receipts.householdId, householdId)];

  if (filters.dateFrom) conditions.push(gte(schema.receipts.purchasedAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(schema.receipts.purchasedAt, new Date(filters.dateTo)));

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    const matchingItemReceiptIds = await db
      .select({ id: schema.receiptItems.receiptId })
      .from(schema.receiptItems)
      .where(ilike(schema.receiptItems.normalizedName, pattern));
    const ids = matchingItemReceiptIds.map((r) => r.id);
    conditions.push(
      or(ilike(schema.receipts.merchantNameRaw, pattern), ids.length ? inArray(schema.receipts.id, ids) : sql`false`)!
    );
  }

  if (filters.categoryId) {
    const itemReceiptIds = await db
      .select({ id: schema.receiptItems.receiptId })
      .from(schema.receiptItems)
      .where(eq(schema.receiptItems.categoryId, filters.categoryId));
    const ids = itemReceiptIds.map((r) => r.id);
    conditions.push(ids.length ? inArray(schema.receipts.id, ids) : sql`false`);
  }

  const orderBy =
    filters.sort === "date_asc"
      ? asc(schema.receipts.purchasedAt)
      : filters.sort === "amount_desc"
        ? desc(schema.receipts.totalMinor)
        : filters.sort === "amount_asc"
          ? asc(schema.receipts.totalMinor)
          : desc(schema.receipts.purchasedAt);

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(schema.receipts).where(where);

  const rows = await db
    .select()
    .from(schema.receipts)
    .where(where)
    .orderBy(orderBy)
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  const itemCounts = rows.length
    ? await db
        .select({ receiptId: schema.receiptItems.receiptId, n: sql<number>`count(*)::int` })
        .from(schema.receiptItems)
        .where(inArray(schema.receiptItems.receiptId, rows.map((r) => r.id)))
        .groupBy(schema.receiptItems.receiptId)
    : [];
  const countById = new Map(itemCounts.map((c) => [c.receiptId, c.n]));

  return {
    receipts: rows.map((r) => ({ ...r, itemCount: countById.get(r.id) ?? 0 })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function updateReceipt(db: Database, householdId: string, id: string, input: Partial<ReceiptInput>) {
  const existing = await getReceiptById(db, householdId, id);
  if (!existing) return null;

  // See the comment in createReceipt: neon-http has no transaction support,
  // so these run sequentially rather than atomically.
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.merchantNameRaw !== undefined) updates.merchantNameRaw = input.merchantNameRaw;
  if (input.purchasedAt !== undefined) updates.purchasedAt = new Date(input.purchasedAt);
  if (input.receiptNumber !== undefined) updates.receiptNumber = input.receiptNumber;
  if (input.subtotalMinor !== undefined) updates.subtotalMinor = input.subtotalMinor;
  if (input.discountMinor !== undefined) updates.discountMinor = input.discountMinor;
  if (input.taxMinor !== undefined) updates.taxMinor = input.taxMinor;
  if (input.otherChargesMinor !== undefined) updates.otherChargesMinor = input.otherChargesMinor;
  if (input.totalMinor !== undefined) updates.totalMinor = input.totalMinor;
  if (input.printedTotalMinor !== undefined) updates.printedTotalMinor = input.printedTotalMinor;
  if (input.paymentMethod !== undefined) updates.paymentMethod = input.paymentMethod;
  if (input.notes !== undefined) updates.notes = input.notes;

  await db.update(schema.receipts).set(updates).where(eq(schema.receipts.id, id));

  if (input.items) {
    await db.delete(schema.receiptItems).where(eq(schema.receiptItems.receiptId, id));
    await db.insert(schema.receiptItems).values(
      input.items.map((item, idx) => ({
        receiptId: id,
        rawDescription: item.rawDescription,
        normalizedName: item.normalizedName ?? item.rawDescription,
        quantity: String(item.quantity),
        unitPriceMinor: item.unitPriceMinor,
        lineTotalMinor: item.lineTotalMinor,
        categoryId: item.categoryId ?? null,
        isUncertain: item.isUncertain ?? false,
        sortOrder: idx,
      }))
    );
  }

  return getReceiptById(db, householdId, id);
}

export async function deleteReceiptRow(db: Database, householdId: string, id: string) {
  const existing = await getReceiptById(db, householdId, id);
  if (!existing) return null;
  await db.delete(schema.receipts).where(eq(schema.receipts.id, id));
  return existing;
}
