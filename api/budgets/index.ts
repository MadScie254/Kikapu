import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, parseBody, parseQuery, sendJson, HttpError } from "../../lib/http.js";
import { budgetInputSchema } from "../../shared/validation/schemas.js";
import { listBudgetsForPeriod, upsertBudget } from "../../lib/db/queries/budgetQueries.js";

const querySchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).default(() => new Date().toISOString().slice(0, 7)),
});

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();

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
});
