import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { getShoppingListById, updateShoppingList, deleteShoppingList } from "../../lib/db/queries/shoppingListQueries.js";

const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), completed: z.boolean().optional() });

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();
  const id = req.query.id as string;

  if (req.method === "GET") {
    const list = await getShoppingListById(db, ctx.householdId, id);
    if (!list) throw new HttpError(404, "Shopping list not found.");
    sendJson(res, 200, { list });
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const input = parseBody(updateSchema, req);
    const list = await updateShoppingList(db, ctx.householdId, id, input);
    if (!list) throw new HttpError(404, "Shopping list not found.");
    sendJson(res, 200, { list });
    return;
  }

  if (req.method === "DELETE") {
    const deleted = await deleteShoppingList(db, ctx.householdId, id);
    if (!deleted) throw new HttpError(404, "Shopping list not found.");
    sendJson(res, 200, { ok: true });
    return;
  }

  throw new HttpError(405, `Method ${req.method} not allowed`);
});
