import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseQuery, sendJson } from "../../lib/http.js";
import { getProductPriceHistory } from "../../lib/db/queries/storeQueries.js";

const querySchema = z.object({ product: z.string().trim().min(1) });

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const { product } = parseQuery(querySchema, req);
  const db = getDb();
  const result = await getProductPriceHistory(db, ctx.householdId, product);
  sendJson(res, 200, result);
});
