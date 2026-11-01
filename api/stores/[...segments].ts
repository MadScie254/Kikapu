import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseQuery, sendJson, HttpError } from "../../lib/http.js";
import { listStores, getProductPriceHistory } from "../../lib/db/queries/storeQueries.js";

/**
 * Consolidated /api/stores/* routes: /api/stores (GET) and
 * /api/stores/price-history (GET), combined into one function to stay
 * under Vercel Hobby's 12-function-per-deployment limit.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const db = getDb();
  const segments = ([] as string[]).concat((req.query.segments as string | string[] | undefined) ?? []);

  if (segments.length === 0) {
    const stores = await listStores(db, ctx.householdId);
    sendJson(res, 200, { stores });
    return;
  }

  if (segments.length === 1 && segments[0] === "price-history") {
    const { product } = parseQuery(z.object({ product: z.string().trim().min(1) }), req);
    const result = await getProductPriceHistory(db, ctx.householdId, product);
    sendJson(res, 200, result);
    return;
  }

  throw new HttpError(404, "Not found.");
});
