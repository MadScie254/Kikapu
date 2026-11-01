import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, sendJson, HttpError } from "../../../lib/http.js";
import { getReceiptById } from "../../../lib/db/queries/receiptQueries.js";

/**
 * Authenticated receipt-image proxy. The Blob URL itself is never exposed to
 * the browser — the client always requests this route, which verifies the
 * receipt belongs to the caller's household before streaming the image.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const db = getDb();
  const id = req.query.id as string;

  const receipt = await getReceiptById(db, ctx.householdId, id);
  if (!receipt) throw new HttpError(404, "Receipt not found.");
  if (!receipt.imageUrl) throw new HttpError(404, "This receipt has no stored image.");

  const upstream = await fetch(receipt.imageUrl);
  if (!upstream.ok || !upstream.body) throw new HttpError(404, "Image is no longer available.");

  res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=3600");
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.status(200).send(buf);
});
