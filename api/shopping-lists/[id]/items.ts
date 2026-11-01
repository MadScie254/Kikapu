import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, sendJson, HttpError } from "../../../lib/http.js";
import { shoppingListItemInputSchema } from "../../../shared/validation/schemas.js";
import { getShoppingListById, addShoppingListItem, estimatePriceForItemName } from "../../../lib/db/queries/shoppingListQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ctx = await requireAuth(req);
  const db = getDb();
  const listId = req.query.id as string;

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

  const item = await addShoppingListItem(db, listId, {
    name: input.name,
    quantity: input.quantity,
    estimatedPriceMinor,
    estimateSource,
  });
  sendJson(res, 201, { item });
});
