import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { and, eq, inArray, asc } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, parseQuery, sendJson, HttpError } from "../../lib/http.js";
import { clearSessionCookie } from "../../lib/auth.js";
import { onboardingSchema, userPreferencesUpdateSchema } from "../../shared/validation/schemas.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";
import { minorToDecimalString } from "../../shared/money.js";

/**
 * Consolidated /api/user/* routes — preferences, onboarding, account,
 * export — combined into one function to stay under Vercel Hobby's
 * 12-function-per-deployment limit. Public URL paths are unchanged.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const action = req.query.action as string;
  const ctx = await requireAuth(req);
  const db = getDb();

  if (action === "preferences") {
    requireMethod(req, "PUT", "PATCH");
    const input = parseBody(userPreferencesUpdateSchema, req);

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
    return;
  }

  if (action === "onboarding") {
    requireMethod(req, "POST");
    const input = parseBody(onboardingSchema, req);

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
    return;
  }

  if (action === "account") {
    requireMethod(req, "DELETE");
    await db.delete(schema.households).where(eq(schema.households.id, ctx.householdId));
    await db.delete(schema.users).where(eq(schema.users.id, ctx.userId));
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (action === "export") {
    requireMethod(req, "GET");
    const { format } = parseQuery(z.object({ format: z.enum(["json", "csv"]).default("json") }), req);

    const receipts = await db
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.householdId, ctx.householdId))
      .orderBy(asc(schema.receipts.purchasedAt));

    const items = await db
      .select()
      .from(schema.receiptItems)
      .innerJoin(schema.receipts, eq(schema.receiptItems.receiptId, schema.receipts.id))
      .where(eq(schema.receipts.householdId, ctx.householdId));

    if (format === "csv") {
      const header = "receipt_date,merchant,product,quantity,unit_price,line_total,receipt_total\n";
      const lines = items.map((row) => {
        const i = row.receipt_items;
        const r = row.receipts;
        return [
          r.purchasedAt.toISOString().slice(0, 10),
          csvEscape(r.merchantNameRaw),
          csvEscape(i.rawDescription),
          i.quantity,
          minorToDecimalString(i.unitPriceMinor),
          minorToDecimalString(i.lineTotalMinor),
          minorToDecimalString(r.totalMinor),
        ].join(",");
      });
      res.status(200).setHeader("Content-Type", "text/csv").setHeader("Content-Disposition", "attachment; filename=kikapu-export.csv");
      res.send(header + lines.join("\n"));
      return;
    }

    res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .setHeader("Content-Disposition", "attachment; filename=kikapu-export.json")
      .send(JSON.stringify({ exportedAt: new Date().toISOString(), receipts }, null, 2));
    return;
  }

  throw new HttpError(404, "Not found.");
});

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
