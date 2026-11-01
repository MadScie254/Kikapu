import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { withApi, requireAuth, requireMethod, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { enforceRateLimit } from "../../lib/rateLimit.js";
import { cloudflareAiConfigured, transcribeReceiptImage, CloudflareAiError } from "../../lib/cloudflareAI.js";
import { parseReceiptText } from "../../shared/parsing/receiptParser.js";

/**
 * OPTIONAL AI enhancement. Off by default and only reachable when:
 *  1. the deployer has set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, AND
 *  2. the caller explicitly sends consent:true on THIS request (not just a
 *     stored preference); re-asserted every scan so the disclosure stays
 *     meaningful.
 * If either is missing, or the Workers AI call fails/hits quota, callers
 * must fall back to the free Tesseract.js + deterministic parser pipeline;
 * this endpoint never pretends that fallback already happened.
 *
 * Workers AI is used purely as a better OCR engine (image -> verbatim
 * text); the structured item/total/tax extraction runs through the SAME
 * parseReceiptText() the free on-device scanner uses, so an AI-assisted
 * scan is checked, tested and debugged the same way a free one is.
 */
const bodySchema = z.object({
  imageBase64: z.string().min(100).max(7_000_000),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  consent: z.literal(true, { errorMap: () => ({ message: "AI enhancement requires explicit consent for this scan." }) }),
});

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ctx = await requireAuth(req);

  if (!cloudflareAiConfigured()) {
    sendJson(res, 501, {
      error: "ai_not_configured",
      message: "AI-enhanced scanning isn't enabled on this deployment. Use the free on-device scanner instead.",
    });
    return;
  }

  const { imageBase64, contentType } = parseBody(bodySchema, req);
  if (ctx.role !== "admin") await enforceRateLimit(`ai:${ctx.userId}`, 15, 24 * 60 * 60);

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  let rawText: string;
  try {
    rawText = await transcribeReceiptImage(base64Data, contentType);
  } catch (err) {
    if (err instanceof CloudflareAiError) {
      throw new HttpError(
        err.status === 429 ? 429 : 502,
        err.status === 429
          ? "Cloudflare's free daily AI allocation is used up for today. Please use the free scanner, or try AI enhancement again tomorrow."
          : "The AI service couldn't process this image. Please use the free scanner instead."
      );
    }
    throw err;
  }

  const result = parseReceiptText(rawText);
  sendJson(res, 200, { result, rawText, source: "ai" });
});
