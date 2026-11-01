import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { withApi, requireAuth, requireMethod, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { enforceRateLimit } from "../../lib/rateLimit.js";
import { uploadReceiptImage, BLOB_CONFIGURED } from "../../lib/blob.js";

/**
 * Vercel's Hobby plan caps a serverless function's request body at ~4.5MB,
 * so receipt photos are sent base64-encoded JSON (simpler and more robust
 * across browsers than multipart) AFTER the client compresses them via
 * Canvas. Compress to well under ~2MB raw before calling this endpoint.
 */
const bodySchema = z.object({
  imageBase64: z.string().min(100).max(7_000_000), // ~5MB raw after base64 overhead
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ctx = await requireAuth(req);

  if (!BLOB_CONFIGURED) {
    sendJson(res, 200, {
      stored: false,
      message:
        "Image storage isn't configured on this deployment. Your receipt details will still be saved, just not the photo itself.",
    });
    return;
  }

  await enforceRateLimit(`upload:${ctx.userId}`, 40, 60 * 60);

  const { imageBase64, contentType } = parseBody(bodySchema, req);
  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const buffer = Buffer.from(base64Data, "base64");

  try {
    const { pathname } = await uploadReceiptImage(ctx.householdId, buffer, contentType);
    sendJson(res, 200, { stored: true, imageBlobPath: pathname });
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : "Could not store the image.");
  }
});
