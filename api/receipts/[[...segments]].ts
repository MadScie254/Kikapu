import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseBody, parseQuery, sendJson, HttpError, getCatchAllSegments } from "../../lib/http.js";
import { receiptInputSchema, receiptUpdateSchema } from "../../shared/validation/schemas.js";
import {
  createReceipt,
  checkForDuplicate,
  listReceipts,
  getReceiptById,
  updateReceipt,
  deleteReceiptRow,
} from "../../lib/db/queries/receiptQueries.js";
import { deleteReceiptImage } from "../../lib/blob.js";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Consolidated /api/receipts/* routes:
 *   /api/receipts              GET (list), POST (create)
 *   /api/receipts/:id          GET, PUT/PATCH, DELETE
 *   /api/receipts/:id/image    GET (authenticated image proxy)
 * Combined into one catch-all function to stay under Vercel Hobby's
 * 12-function-per-deployment limit. Public URL paths are unchanged.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();
  const segments = getCatchAllSegments(req);

  // /api/receipts
  if (segments.length === 0) {
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
  }

  // /api/receipts/:id/image
  if (segments.length === 2 && segments[1] === "image") {
    requireMethod(req, "GET");
    const receipt = await getReceiptById(db, ctx.householdId, segments[0]);
    if (!receipt) throw new HttpError(404, "Receipt not found.");
    if (!receipt.imageUrl) throw new HttpError(404, "This receipt has no stored image.");

    const upstream = await fetch(receipt.imageUrl);
    if (!upstream.ok || !upstream.body) throw new HttpError(404, "Image is no longer available.");

    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(200).send(buf);
    return;
  }

  // /api/receipts/:id
  if (segments.length === 1) {
    const id = segments[0];
    if (req.method === "GET") {
      const receipt = await getReceiptById(db, ctx.householdId, id);
      if (!receipt) throw new HttpError(404, "Receipt not found.");
      sendJson(res, 200, { receipt });
      return;
    }
    if (req.method === "PUT" || req.method === "PATCH") {
      const input = parseBody(receiptUpdateSchema, req);
      const receipt = await updateReceipt(db, ctx.householdId, id, input);
      if (!receipt) throw new HttpError(404, "Receipt not found.");
      sendJson(res, 200, { receipt });
      return;
    }
    if (req.method === "DELETE") {
      const deleted = await deleteReceiptRow(db, ctx.householdId, id);
      if (!deleted) throw new HttpError(404, "Receipt not found.");
      if (deleted.imageBlobPath) await deleteReceiptImage(deleted.imageBlobPath);
      sendJson(res, 200, { ok: true });
      return;
    }
    throw new HttpError(405, `Method ${req.method} not allowed`);
  }

  throw new HttpError(404, "Not found.");
});
