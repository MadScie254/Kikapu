import type { Database } from "./client.js";
import { households, householdMembers, categories } from "./schema.js";
import { DEFAULT_CATEGORIES } from "../../shared/categories.js";

/**
 * Creates a new household for a freshly-registered user, seeded with the
 * default category taxonomy plus a hidden "Overall" category used to store
 * the household-wide monthly budget (see schema.ts budgets table comment).
 */
export async function provisionHousehold(db: Database, userId: string) {
  const [household] = await db
    .insert(households)
    .values({ name: "My Household", currency: "KES", createdByUserId: userId })
    .returning();

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId,
    role: "owner",
  });

  await db.insert(categories).values([
    {
      householdId: household.id,
      slug: "overall",
      name: "Overall Budget",
      icon: "Wallet",
      color: "#14213D",
      isDefault: true,
      isOverall: true,
      isActive: true,
    },
    ...DEFAULT_CATEGORIES.map((c) => ({
      householdId: household.id,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: true,
      isOverall: false,
      isActive: true,
    })),
  ]);

  return household;
}
