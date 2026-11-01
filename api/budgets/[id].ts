import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, sendJson, HttpError } from "../../lib/http.js";
import { deleteBudget } from "../../lib/db/queries/budgetQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "DELETE");
  const ctx = await requireAuth(req);
  const db = getDb();
  const id = req.query.id as string;
  const deleted = await deleteBudget(db, ctx.householdId, id);
  if (!deleted) throw new HttpError(404, "Budget not found.");
  sendJson(res, 200, { ok: true });
});
