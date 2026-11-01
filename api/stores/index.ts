import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, sendJson } from "../../lib/http.js";
import { listStores } from "../../lib/db/queries/storeQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const db = getDb();
  const stores = await listStores(db, ctx.householdId);
  sendJson(res, 200, { stores });
});
