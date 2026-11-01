import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../../../lib/db/client.js";
import { withApi, requireAuth, parseBody, sendJson, HttpError } from "../../../../lib/http.js";
import { getShoppingListById, updateShoppingListItem, deleteShoppingListItem } from "../../../../lib/db/queries/shoppingListQueries.js";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  quantity: z.number().positive().max(100000).optional(),
  estimatedPriceMinor: z.number().int().min(0).nullable().optional(),
  purchased: z.boolean().optional(),
});

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();
  const listId = req.query.id as string;
  const itemId = req.query.itemId as string;

  // Ownership check: the item's list must belong to the caller's household.
  const list = await getShoppingListById(db, ctx.householdId, listId);
  if (!list) throw new HttpError(404, "Shopping list not found.");
  if (!list.items.some((i) => i.id === itemId)) throw new HttpError(404, "Item not found on this list.");

  if (req.method === "PUT" || req.method === "PATCH") {
    const input = parseBody(updateSchema, req);
    const item = await updateShoppingListItem(db, itemId, input);
    sendJson(res, 200, { item });
    return;
  }

  if (req.method === "DELETE") {
    await deleteShoppingListItem(db, itemId);
    sendJson(res, 200, { ok: true });
    return;
  }

  throw new HttpError(405, `Method ${req.method} not allowed`);
});
