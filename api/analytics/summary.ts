import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseQuery, sendJson } from "../../lib/http.js";
import { computeAnalyticsSummary } from "../../lib/db/queries/analyticsQueries.js";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "../../shared/dates.js";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  range: z.enum(["month", "year", "custom"]).optional().default("month"),
});

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const q = parseQuery(querySchema, req);
  const db = getDb();

  const now = new Date();
  let start: Date, end: Date;
  if (q.range === "custom" && q.from && q.to) {
    start = new Date(q.from);
    end = new Date(q.to);
  } else if (q.range === "year") {
    start = startOfYear(now);
    end = endOfYear(now);
  } else {
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  const [household] = await db
    .select()
    .from(schema.households)
    .where(eq(schema.households.id, ctx.householdId))
    .limit(1);

  const summary = await computeAnalyticsSummary(db, ctx.householdId, { start, end }, household?.monthlyBudgetMinor ?? null, now);
  sendJson(res, 200, { summary });
});
