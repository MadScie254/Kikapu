import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, sendJson } from "../../lib/http.js";
import { clearSessionCookie } from "../../lib/auth.js";

/**
 * Permanently deletes the signed-in user's account AND their household
 * (receipts, items, budgets, shopping lists, merchants, products, categories
 * all cascade via FK `onDelete: cascade`). There is no undo — the client
 * must confirm with the user before calling this.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "DELETE");
  const ctx = await requireAuth(req);
  const db = getDb();

  await db.delete(schema.households).where(eq(schema.households.id, ctx.householdId));
  await db.delete(schema.users).where(eq(schema.users.id, ctx.userId));

  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
});
