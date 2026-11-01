/**
 * Applies pending Drizzle migrations to DATABASE_URL.
 * Usage: npm run db:migrate   (after npm run db:generate)
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }
  const sql = neon(url);
  const db = drizzle(sql);
  console.log("Applying migrations from lib/db/migrations ...");
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  console.log("Migrations applied successfully.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
