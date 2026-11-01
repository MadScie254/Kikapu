import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazily-created Drizzle client over Neon's HTTP driver — well-suited to
 * Vercel's serverless functions because it opens no long-lived TCP
 * connection per invocation. Throws a clear error (instead of crashing with
 * an unhelpful Postgres message) when DATABASE_URL is missing.
 */
export function getDb() {
  if (cachedDb) return cachedDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set it to your Neon connection string " +
        "(see README.md > Deployment > Database for setup steps)."
    );
  }
  const sql = neon(url);
  cachedDb = drizzle(sql, { schema });
  return cachedDb;
}

export type Database = ReturnType<typeof getDb>;
export { schema };
