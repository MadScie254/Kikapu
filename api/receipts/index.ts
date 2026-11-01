import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, parseBody, parseQuery, sendJson, HttpError } from "../../lib/http.js";
import { receiptInputSchema } from "../../shared/validation/schemas.js";
import { createReceipt, checkForDuplicate, listReceipts } from "../../lib/db/queries/receiptQueries.js";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();

  if (req.method === "GET") {
    const q = parseQuery(listQuerySchema, req);
    const result = await listReceipts(db, ctx.householdId, q);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST") {
    const input = parseBody(receiptInputSchema, req);

    if (!input.acknowledgeDuplicate) {
      const duplicate = await checkForDuplicate(db, ctx.householdId, input);
      if (duplicate) {
        sendJson(res, 200, {
          possibleDuplicate: {
            id: duplicate.id,
            merchantNameRaw: duplicate.merchantNameRaw,
            purchasedAt: duplicate.purchasedAt,
            totalMinor: duplicate.totalMinor,
          },
        });
        return;
      }
    }

    const receipt = await createReceipt(db, ctx.householdId, ctx.userId, input);
    sendJson(res, 201, { receipt });
    return;
  }

  throw new HttpError(405, `Method ${req.method} not allowed`);
});
