import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ZodType } from "zod";
import { getAuthContext, type AuthContext } from "./auth.js";

export class HttpError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function applyCors(req: VercelRequest, res: VercelResponse) {
  const allowed = process.env.CORS_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && allowed.split(",").map((o) => o.trim()).includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

/**
 * Wraps a Vercel function handler with: CORS for local dev, OPTIONS
 * preflight, centralized error handling (never leaks stack traces or
 * internals to the client), and privacy-conscious server-side logging
 * (error message + route only — never request bodies, passwords, or
 * cookies).
 */
export function withApi(handler: Handler): Handler {
  return async (req, res) => {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: errorSlug(err.status), message: err.message, fields: err.fields });
        return;
      }
      console.error(`[api] ${req.method} ${req.url} failed:`, err instanceof Error ? err.message : err);
      sendJson(res, 500, { error: "internal_error", message: "Something went wrong. Please try again." });
    }
  };
}

function errorSlug(status: number): string {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  return "error";
}

export function requireMethod(req: VercelRequest, ...methods: string[]) {
  if (!methods.includes(req.method ?? "")) {
    throw new HttpError(405, `Method ${req.method} not allowed`);
  }
}

export async function requireAuth(req: VercelRequest): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!ctx) throw new HttpError(401, "Please sign in to continue.");
  return ctx;
}

export function parseBody<T>(schema: ZodType<T, any, any>, req: VercelRequest): T {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      fields[issue.path.join(".") || "_"] = issue.message;
    }
    throw new HttpError(400, "Please check the highlighted fields.", fields);
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodType<T, any, any>, req: VercelRequest): T {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw new HttpError(400, "Invalid query parameters.");
  }
  return result.data;
}

/** Ensures a resource row's household matches the authenticated user's household — the core ownership guard. */
export function assertOwnership(resourceHouseholdId: string, ctx: AuthContext) {
  if (resourceHouseholdId !== ctx.householdId) {
    throw new HttpError(404, "Not found.");
  }
}
