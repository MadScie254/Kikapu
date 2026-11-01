/**
 * OPTIONAL AI-enhanced scanning via Cloudflare Workers AI. Off by default;
 * only reachable when CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are
 * both set on the deployment. Uses Workers AI purely as a better OCR
 * engine (image -> verbatim text transcription); the actual structured
 * extraction still runs through the same deterministic parseReceiptText()
 * used by the free on-device Tesseract path, so AI-assisted scans get the
 * same tested item/total/tax logic, not a second, less-auditable one.
 *
 * Model choice: @cf/mistralai/mistral-small-3.1-24b-instruct, verified
 * directly against a real Cloudflare account and a real Khetia receipt
 * photo — correctly transcribed all 8 line items, quantities and prices
 * (including two totals Tesseract.js lost entirely), with the result
 * matching the printed total exactly after parsing. Two other
 * Workers AI vision models were tried first and rejected: moondream
 * returned an empty result for every request (account/model-side issue,
 * not a request bug), and llava-1.5-7b-hf hallucinated repetitive
 * garbage on this receipt's dense text instead of reading it.
 *
 * Workers AI's free allocation is 10,000 Neurons/day per Cloudflare
 * account (resets daily at 00:00 UTC); one receipt transcription costs
 * roughly 80 Neurons, so well over 100 free scans/day.
 */

const WORKERS_AI_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

const TRANSCRIBE_PROMPT =
  "Transcribe every line of printed text on this receipt exactly as it appears, top to bottom, in reading order. Preserve the ORIGINAL line breaks exactly as printed: if a product's name and its quantity/price line are printed as two separate lines, output them as two separate lines, never merged onto one. Include all item names, quantities, unit prices, line totals, header and footer text verbatim, with original spelling, punctuation and numbers. Output ONLY the transcription as plain text, one receipt line per output line, nothing else. Do not summarize, translate, correct, reformat, merge lines, add commentary, or wrap it in markdown code fences.";

export class CloudflareAiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function cloudflareAiConfigured(): boolean {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

/** Strips a markdown code fence and any "Sure, here is..." preamble the model sometimes adds despite being told not to. */
function cleanTranscription(text: string): string {
  let cleaned = text.trim();
  const fenced = cleaned.match(/```[a-z]*\n([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  cleaned = cleaned.replace(/^(sure|here'?s?|certainly|okay)[^\n]*:?\s*\n+/i, "");
  return cleaned;
}

/** Sends a receipt photo to Cloudflare Workers AI and returns its best-effort verbatim transcription. */
export async function transcribeReceiptImage(base64Data: string, contentType: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new CloudflareAiError("Cloudflare Workers AI is not configured.", 501);
  }

  let res: Response;
  try {
    res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: TRANSCRIBE_PROMPT },
              { type: "image_url", image_url: { url: `data:${contentType};base64,${base64Data}` } },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0,
      }),
    });
  } catch {
    throw new CloudflareAiError("Couldn't reach Cloudflare Workers AI.", 502);
  }

  if (res.status === 429) {
    throw new CloudflareAiError("Cloudflare Workers AI's free daily allocation is used up for today.", 429);
  }
  if (!res.ok) {
    throw new CloudflareAiError(`Cloudflare Workers AI request failed (${res.status}).`, 502);
  }

  const data: any = await res.json().catch(() => null);
  const text: string | undefined = data?.result?.response ?? data?.result?.choices?.[0]?.message?.content;
  if (!data?.success || !text || !text.trim()) {
    throw new CloudflareAiError("Cloudflare Workers AI returned an unexpected response.", 502);
  }

  return cleanTranscription(text);
}
