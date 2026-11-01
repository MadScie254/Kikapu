/**
 * Seeds a demo account with realistic fixture data for LOCAL DEVELOPMENT ONLY.
 * Never run against a production database you care about; it inserts a
 * fresh demo user every run. Usage: npm run db:seed
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema.js";
import { hashPassword } from "../lib/auth.js";
import { provisionHousehold } from "../lib/db/provisionHousehold.js";
import { eq } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = neon(url);
  const db = drizzle(sql, { schema });

  const email = "demo@kikapu.app";
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length) {
    console.log(`Demo user ${email} already exists (id ${existing[0].id}). Skipping.`);
    return;
  }

  const passwordHash = await hashPassword("Kikapu2026!");
  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash, displayName: "Amina Wanjiru" })
    .returning();

  await db.insert(schema.userPreferences).values({ userId: user.id });

  const household = await provisionHousehold(db as any, user.id);
  await db
    .update(schema.households)
    .set({ monthlyBudgetMinor: 3_500_000, onboardingCompletedAt: new Date() })
    .where(eq(schema.households.id, household.id));

  const cats = await db.select().from(schema.categories).where(eq(schema.categories.householdId, household.id));
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

  const [naivas] = await db
    .insert(schema.merchants)
    .values({ householdId: household.id, name: "Naivas Supermarket", normalizedName: "naivas" })
    .returning();
  const [market] = await db
    .insert(schema.merchants)
    .values({ householdId: household.id, name: "Kawangware Market", normalizedName: "kawangwaremarket" })
    .returning();

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);

  async function addReceipt(opts: {
    merchantId: string;
    merchantName: string;
    date: Date;
    source: "ocr" | "manual" | "market";
    items: { name: string; qty: number; unitPriceMinor: number; categorySlug: string }[];
  }) {
    const items = opts.items.map((i) => ({ ...i, lineTotalMinor: Math.round(i.qty * i.unitPriceMinor) }));
    const subtotal = items.reduce((s, i) => s + i.lineTotalMinor, 0);
    const [receipt] = await db
      .insert(schema.receipts)
      .values({
        householdId: household.id,
        merchantId: opts.merchantId,
        merchantNameRaw: opts.merchantName,
        purchasedAt: opts.date,
        subtotalMinor: subtotal,
        totalMinor: subtotal,
        printedTotalMinor: subtotal,
        source: opts.source,
        createdByUserId: user.id,
      })
      .returning();

    await db.insert(schema.receiptItems).values(
      items.map((i, idx) => ({
        receiptId: receipt.id,
        rawDescription: i.name,
        normalizedName: i.name,
        quantity: String(i.qty),
        unitPriceMinor: i.unitPriceMinor,
        lineTotalMinor: i.lineTotalMinor,
        categoryId: catBySlug[i.categorySlug]?.id ?? null,
        sortOrder: idx,
      }))
    );
    return receipt;
  }

  await addReceipt({
    merchantId: naivas.id,
    merchantName: "Naivas Supermarket",
    date: daysAgo(1),
    source: "ocr",
    items: [
      { name: "Cooking Oil 2L", qty: 1, unitPriceMinor: 65000, categorySlug: "groceries" },
      { name: "Maize Flour 2Kg", qty: 2, unitPriceMinor: 19000, categorySlug: "groceries" },
      { name: "Milk 500ml", qty: 3, unitPriceMinor: 6500, categorySlug: "groceries" },
      { name: "Bathing Soap", qty: 2, unitPriceMinor: 8500, categorySlug: "personal-care" },
    ],
  });

  await addReceipt({
    merchantId: naivas.id,
    merchantName: "Naivas Supermarket",
    date: daysAgo(8),
    source: "ocr",
    items: [
      { name: "Rice 5Kg", qty: 1, unitPriceMinor: 85000, categorySlug: "groceries" },
      { name: "Chicken 1Kg", qty: 1, unitPriceMinor: 55000, categorySlug: "meat-fish" },
      { name: "Washing Powder 1Kg", qty: 1, unitPriceMinor: 35000, categorySlug: "household" },
    ],
  });

  await addReceipt({
    merchantId: market.id,
    merchantName: "Kawangware Market",
    date: daysAgo(3),
    source: "market",
    items: [
      { name: "Tomatoes", qty: 1, unitPriceMinor: 10000, categorySlug: "market" },
      { name: "Onions", qty: 1, unitPriceMinor: 5000, categorySlug: "market" },
      { name: "Sukuma Wiki", qty: 1, unitPriceMinor: 4000, categorySlug: "market" },
    ],
  });

  await db.insert(schema.budgets).values([
    {
      householdId: household.id,
      categoryId: catBySlug["overall"].id,
      periodMonth: today.toISOString().slice(0, 7),
      amountMinor: 3_500_000,
    },
    {
      householdId: household.id,
      categoryId: catBySlug["groceries"].id,
      periodMonth: today.toISOString().slice(0, 7),
      amountMinor: 2_000_000,
    },
  ]);

  const [list] = await db
    .insert(schema.shoppingLists)
    .values({ householdId: household.id, name: "This Week", createdByUserId: user.id })
    .returning();
  await db.insert(schema.shoppingListItems).values([
    { shoppingListId: list.id, name: "Cooking Oil 2L", quantity: "1", estimatedPriceMinor: 65000, estimateSource: "historical", sortOrder: 0 },
    { shoppingListId: list.id, name: "Eggs (tray)", quantity: "1", estimateSource: "none", sortOrder: 1 },
  ]);

  console.log("✅ Seeded demo account:");
  console.log(`   email: ${email}`);
  console.log(`   password: Kikapu2026!`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
