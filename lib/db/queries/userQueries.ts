import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { schema } from "../client.js";
import type { PublicUser } from "../../../shared/types.js";

export async function getPublicUserPayload(db: Database, userId: string): Promise<PublicUser | null> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.deletedAt) return null;

  const [prefs] = await db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);

  const [membership] = await db
    .select()
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, userId))
    .limit(1);

  let household = null;
  if (membership) {
    const [h] = await db
      .select()
      .from(schema.households)
      .where(eq(schema.households.id, membership.householdId))
      .limit(1);
    household = h ?? null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    currency: household?.currency ?? "KES",
    monthlyBudgetMinor: household?.monthlyBudgetMinor ?? null,
    onboardingCompletedAt: household?.onboardingCompletedAt?.toISOString() ?? null,
    aiEnhancementOptIn: prefs?.aiEnhancementOptIn ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}
