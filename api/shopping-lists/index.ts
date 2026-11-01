import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { shoppingListInputSchema } from "../../shared/validation/schemas.js";
import { listShoppingLists, createShoppingList } from "../../lib/db/queries/shoppingListQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();

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
});
