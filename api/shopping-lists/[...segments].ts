import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { shoppingListInputSchema, shoppingListItemInputSchema } from "../../shared/validation/schemas.js";
import {
  listShoppingLists,
  createShoppingList,
  getShoppingListById,
  updateShoppingList,
  deleteShoppingList,
  addShoppingListItem,
  estimatePriceForItemName,
  updateShoppingListItem,
  deleteShoppingListItem,
} from "../../lib/db/queries/shoppingListQueries.js";

const listUpdateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), completed: z.boolean().optional() });
const itemUpdateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  quantity: z.number().positive().max(100000).optional(),
  estimatedPriceMinor: z.number().int().min(0).nullable().optional(),
  purchased: z.boolean().optional(),
});

/**
 * Consolidated /api/shopping-lists/* routes:
 *   /api/shopping-lists                        GET, POST
 *   /api/shopping-lists/:id                     GET, PUT/PATCH, DELETE
 *   /api/shopping-lists/:id/items                POST
 *   /api/shopping-lists/:id/items/:itemId        PUT/PATCH, DELETE
 * Combined into one catch-all function to stay under Vercel Hobby's
 * 12-function-per-deployment limit. Public URL paths are unchanged.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();
  // Vercel's plain Node builder keeps the literal "..." in a catch-all's
  // query key, so the populated key is "...segments", not "segments".
  const segments = ([] as string[]).concat((req.query["...segments"] as string | string[] | undefined) ?? []);

  // /api/shopping-lists
  if (segments.length === 0) {
    if (req.method === "GET") {
      const lists = await listShoppingLists(db, ctx.householdId);
      sendJson(res, 200, { lists });
      return;
    }
    if (req.method === "POST") {
      const input = parseBody(shoppingListInputSchema, req);
      const list = await createShoppingList(db, ctx.householdId, ctx.userId, input.name);
      sendJson(res, 201, { list });
      return;
    }
    throw new HttpError(405, `Method ${req.method} not allowed`);
  }

  // /api/shopping-lists/:id
  if (segments.length === 1) {
    const id = segments[0];
    if (req.method === "GET") {
      const list = await getShoppingListById(db, ctx.householdId, id);
      if (!list) throw new HttpError(404, "Shopping list not found.");
      sendJson(res, 200, { list });
      return;
    }
    if (req.method === "PUT" || req.method === "PATCH") {
      const input = parseBody(listUpdateSchema, req);
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
  }

  // /api/shopping-lists/:id/items
  if (segments.length === 2 && segments[1] === "items") {
    requireMethod(req, "POST");
    const listId = segments[0];
    const list = await getShoppingListById(db, ctx.householdId, listId);
    if (!list) throw new HttpError(404, "Shopping list not found.");

    const input = parseBody(shoppingListItemInputSchema, req);
    let estimatedPriceMinor = input.estimatedPriceMinor ?? null;
    let estimateSource: "historical" | "manual" | "none" = "none";
    if (estimatedPriceMinor != null) {
      estimateSource = "manual";
    } else {
      const historical = await estimatePriceForItemName(db, ctx.householdId, input.name);
      if (historical != null) {
        estimatedPriceMinor = historical;
        estimateSource = "historical";
      }
    }
    const item = await addShoppingListItem(db, listId, { name: input.name, quantity: input.quantity, estimatedPriceMinor, estimateSource });
    sendJson(res, 201, { item });
    return;
  }

  // /api/shopping-lists/:id/items/:itemId
  if (segments.length === 3 && segments[1] === "items") {
    const [listId, , itemId] = segments;
    const list = await getShoppingListById(db, ctx.householdId, listId);
    if (!list) throw new HttpError(404, "Shopping list not found.");
    if (!list.items.some((i) => i.id === itemId)) throw new HttpError(404, "Item not found on this list.");

    if (req.method === "PUT" || req.method === "PATCH") {
      const input = parseBody(itemUpdateSchema, req);
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
  }

  throw new HttpError(404, "Not found.");
});
