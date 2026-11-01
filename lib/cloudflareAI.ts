/**
 * OPTIONAL AI-enhanced scanning via Cloudflare Workers AI. Off by default;
 * only reachable when CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are
 * both set on the deployment. Uses Workers AI purely as a better OCR
 * engine (image -> verbatim text transcription); the actual structured
 * extraction still runs through the same deterministic parseReceiptText()
 * used by the free on-device Tesseract path, so AI-assisted scans get the
 * same tested item/total/tax logic, not a second, less-auditable one.
 *
 * Workers AI's free allocation is 10,000 Neurons/day per Cloudflare
 * account (resets daily at 00:00 UTC); this vision call is a few hundred
 * Neurons, so a household doing a handful of scans a day stays well
 * within it.
 */

const WORKERS_AI_MODEL = "@cf/moondream/moondream3.1-9B-A2B";

const TRANSCRIBE_PROMPT =
  "Transcribe every line of printed text on this receipt exactly as it appears, top to bottom, in reading order, one receipt line per output line. Include all item names, quantities, unit prices, line totals, header and footer text verbatim, with original spelling, punctuation and numbers. Do not summarize, translate, correct, reformat, or add any commentary of your own.";

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
        task: "query",
        image: `data:${contentType};base64,${base64Data}`,
        question: TRANSCRIBE_PROMPT,
        reasoning: false,
        temperature: 0.1,
        max_tokens: 2048,
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
  const text: string | undefined = data?.result?.answer ?? data?.result?.response;
  if (!data?.success || !text || !text.trim()) {
    throw new CloudflareAiError("Cloudflare Workers AI returned an unexpected response.", 502);
  }

  return text;
}
