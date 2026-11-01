import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, sendJson } from "../../lib/http.js";
import { userPreferencesUpdateSchema } from "../../shared/validation/schemas.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "PUT", "PATCH");
  const ctx = await requireAuth(req);
  const input = parseBody(userPreferencesUpdateSchema, req);
  const db = getDb();

  if (input.displayName !== undefined) {
    await db.update(schema.users).set({ displayName: input.displayName, updatedAt: new Date() }).where(eq(schema.users.id, ctx.userId));
  }

  if (input.currency !== undefined || input.monthlyBudgetMinor !== undefined) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.monthlyBudgetMinor !== undefined) updates.monthlyBudgetMinor = input.monthlyBudgetMinor;
    await db.update(schema.households).set(updates).where(eq(schema.households.id, ctx.householdId));
  }

  if (input.aiEnhancementOptIn !== undefined || input.theme !== undefined) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.aiEnhancementOptIn !== undefined) updates.aiEnhancementOptIn = input.aiEnhancementOptIn;
    if (input.theme !== undefined) updates.theme = input.theme;
    await db.update(schema.userPreferences).set(updates).where(eq(schema.userPreferences.userId, ctx.userId));
  }

  const payload = await getPublicUserPayload(db, ctx.userId);
  sendJson(res, 200, { user: payload });
});
