import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, sendJson } from "../../lib/http.js";
import { onboardingSchema } from "../../shared/validation/schemas.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ctx = await requireAuth(req);
  const input = parseBody(onboardingSchema, req);
  const db = getDb();

  if (input.displayName) {
    await db.update(schema.users).set({ displayName: input.displayName, updatedAt: new Date() }).where(eq(schema.users.id, ctx.userId));
  }

  await db
    .update(schema.households)
    .set({
      currency: input.currency,
      monthlyBudgetMinor: input.monthlyBudgetMinor ?? null,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.households.id, ctx.householdId));

  if (input.selectedCategorySlugs?.length) {
    // Mark chosen categories active and deactivate the rest of the defaults
    // the user didn't pick, so their category list starts relevant to them —
    // they can re-enable any from Settings later.
    await db
      .update(schema.categories)
      .set({ isActive: false })
      .where(and(eq(schema.categories.householdId, ctx.householdId), eq(schema.categories.isDefault, true), eq(schema.categories.isOverall, false)));

    await db
      .update(schema.categories)
      .set({ isActive: true })
      .where(and(eq(schema.categories.householdId, ctx.householdId), inArray(schema.categories.slug, input.selectedCategorySlugs)));
  }

  const payload = await getPublicUserPayload(db, ctx.userId);
  sendJson(res, 200, { user: payload });
});
