import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, parseQuery, sendJson, HttpError } from "../../lib/http.js";
import { budgetInputSchema } from "../../shared/validation/schemas.js";
import { listBudgetsForPeriod, upsertBudget, deleteBudget } from "../../lib/db/queries/budgetQueries.js";

const querySchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).default(() => new Date().toISOString().slice(0, 7)),
});

/**
 * Consolidated /api/budgets/* routes: /api/budgets (GET/POST) and
 * /api/budgets/:id (DELETE), combined into one function to stay under
 * Vercel Hobby's 12-function-per-deployment limit.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();
  // Vercel's plain Node builder keeps the literal "..." in a catch-all's
  // query key, so the populated key is "...segments", not "segments".
  const segments = ([] as string[]).concat((req.query["...segments"] as string | string[] | undefined) ?? []);

  if (segments.length === 0) {
    if (req.method === "GET") {
      const { periodMonth } = parseQuery(querySchema, req);
      const budgets = await listBudgetsForPeriod(db, ctx.householdId, periodMonth);
      sendJson(res, 200, { budgets });
      return;
    }
    if (req.method === "POST") {
      const input = parseBody(budgetInputSchema, req);
      if (!input.categoryId) throw new HttpError(400, "categoryId is required (use the household's Overall category for a whole-budget).");
      const budget = await upsertBudget(db, ctx.householdId, { ...input, categoryId: input.categoryId });
      sendJson(res, 200, { budget });
      return;
    }
    throw new HttpError(405, `Method ${req.method} not allowed`);
  }

  if (segments.length === 1) {
    requireMethod(req, "DELETE");
    const deleted = await deleteBudget(db, ctx.householdId, segments[0]);
    if (!deleted) throw new HttpError(404, "Budget not found.");
    sendJson(res, 200, { ok: true });
    return;
  }

  throw new HttpError(404, "Not found.");
});
