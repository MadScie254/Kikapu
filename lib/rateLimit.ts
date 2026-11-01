import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "./db/client.js";
import { HttpError } from "./http.js";

/**
 * Simple Postgres-backed sliding-window rate limiter. A plain in-memory
 * limiter wouldn't survive across serverless invocations (each may run in a
 * fresh process), so the ledger lives in the database instead. Fine at
 * Kikapu's scale (a handful of households), and keeps auth / upload /
 * AI-enhancement endpoints from being hammered.
 */
export async function enforceRateLimit(bucketKey: string, max: number, windowSeconds: number): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - windowSeconds * 1000);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.rateLimitEvents)
    .where(and(eq(schema.rateLimitEvents.bucketKey, bucketKey), gt(schema.rateLimitEvents.createdAt, since)));

  if (count >= max) {
    throw new HttpError(429, "Too many attempts. Please wait a moment and try again.");
  }

  await db.insert(schema.rateLimitEvents).values({ bucketKey });
}
