import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { withApi, requireAuth, requireMethod, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { enforceRateLimit } from "../../lib/rateLimit.js";

/**
 * OPTIONAL AI enhancement. Off by default and only reachable when:
 *  1. the deployer has set GEMINI_API_KEY, AND
 *  2. the caller explicitly sends consent:true on THIS request (not just a
 *     stored preference) — re-asserted every scan so the disclosure stays
 *     meaningful.
 * If either is missing, or the Gemini call fails/hits quota, callers must
 * fall back to the free Tesseract.js + deterministic parser pipeline; this
 * endpoint never pretends that fallback already happened.
 */
const bodySchema = z.object({
  imageBase64: z.string().min(100).max(7_000_000),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  consent: z.literal(true, { errorMap: () => ({ message: "AI enhancement requires explicit consent for this scan." }) }),
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const EXTRACTION_PROMPT = `You are extracting structured data from a photo of a Kenyan retail or supermarket receipt.
Return ONLY valid JSON (no markdown, no commentary) matching exactly this shape:
{
  "merchantName": string | null,
  "purchasedAt": string | null,   // ISO 8601 date, best guess, null if unreadable
  "receiptNumber": string | null,
  "paymentMethod": string | null, // "Cash" | "M-Pesa" | "Card" | null
  "items": [ { "description": string, "quantity": number, "unitPrice": number, "lineTotal": number } ],
  "subtotal": number | null,
  "discount": number | null,
  "tax": number | null,
  "total": number | null
}
All monetary values are plain decimal numbers in Kenyan Shillings (e.g. 180.00), never strings.
Never include the M-Pesa confirmation code, cash tendered, or change given as a line item.
If you are not confident about a field, use null rather than guessing.`;

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ctx = await requireAuth(req);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 501, {
      error: "ai_not_configured",
      message: "AI-enhanced scanning isn't enabled on this deployment. Use the free on-device scanner instead.",
    });
    return;
  }

  const { imageBase64, contentType } = parseBody(bodySchema, req);
  await enforceRateLimit(`ai:${ctx.userId}`, 15, 24 * 60 * 60);

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: EXTRACTION_PROMPT }, { inline_data: { mime_type: contentType, data: base64Data } }],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      }
    );
  } catch {
    throw new HttpError(502, "Couldn't reach the AI service. Please use the free scanner instead.");
  }

  if (!geminiRes.ok) {
    const status = geminiRes.status === 429 ? 429 : 502;
    throw new HttpError(
      status,
      status === 429
        ? "The AI service is at capacity right now. Please use the free scanner, or try AI enhancement again later."
        : "The AI service couldn't process this image. Please use the free scanner instead."
    );
  }

  const data: any = await geminiRes.json().catch(() => null);
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new HttpError(502, "The AI service returned an unexpected response. Please use the free scanner instead.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(502, "The AI service's response couldn't be read. Please use the free scanner instead.");
  }

  const resultSchema = z.object({
    merchantName: z.string().nullable().optional(),
    purchasedAt: z.string().nullable().optional(),
    receiptNumber: z.string().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    items: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          lineTotal: z.number(),
        })
      )
      .default([]),
    subtotal: z.number().nullable().optional(),
    discount: z.number().nullable().optional(),
    tax: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
  });

  const validated = resultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new HttpError(502, "The AI service's response didn't match the expected format. Please use the free scanner instead.");
  }

  sendJson(res, 200, { result: validated.data, source: "ai" });
});
