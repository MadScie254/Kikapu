import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAuth, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { receiptUpdateSchema } from "../../shared/validation/schemas.js";
import { getReceiptById, updateReceipt, deleteReceiptRow } from "../../lib/db/queries/receiptQueries.js";
import { deleteReceiptImage } from "../../lib/blob.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();
  const id = req.query.id as string;
  if (!id) throw new HttpError(400, "Missing receipt id.");

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
});
