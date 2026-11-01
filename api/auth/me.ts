import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireMethod, requireAuth, sendJson } from "../../lib/http.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const db = getDb();
  const payload = await getPublicUserPayload(db, ctx.userId);
  sendJson(res, 200, { user: payload });
});
