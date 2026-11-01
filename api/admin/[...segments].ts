import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "../../lib/db/client.js";
import { withApi, requireAdmin, requireMethod, requireSetupSecret, parseBody, sendJson, HttpError } from "../../lib/http.js";
import {
  getAdminOverview,
  listHouseholdsForAdmin,
  getHouseholdDetailForAdmin,
  promoteUserToAdmin,
} from "../../lib/db/queries/adminQueries.js";

/**
 * Consolidated /api/admin/* routes: the cross-household admin dashboard
 * (overview, households, households/:id — gated by requireAdmin) plus two
 * one-time setup actions (migrate, bootstrap — gated by a shared secret
 * instead of a role, since they must run before any admin row exists).
 * One function to stay under Vercel Hobby's 12-function-per-deployment limit.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const db = getDb();
  // Vercel's plain Node builder (not Next.js) keeps the literal "..." in a
  // catch-all route's query key, so the populated key is "...segments", not
  // "segments".
  const segments = ([] as string[]).concat((req.query["...segments"] as string | string[] | undefined) ?? []);

  // One-time setup actions: secret-gated, not role-gated.
  if (segments.length === 1 && segments[0] === "migrate") {
    requireMethod(req, "POST");
    requireSetupSecret(req);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user'`);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (segments.length === 1 && segments[0] === "bootstrap") {
    requireMethod(req, "POST");
    requireSetupSecret(req);
    const { email } = parseBody(z.object({ email: z.string().trim().toLowerCase().email() }), req);
    const promoted = await promoteUserToAdmin(db, email);
    if (!promoted) throw new HttpError(404, "No account with that email.");
    sendJson(res, 200, { ok: true, user: promoted });
    return;
  }

  // Everything below requires an authenticated admin.
  await requireAdmin(req);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "overview")) {
    requireMethod(req, "GET");
    const overview = await getAdminOverview(db);
    sendJson(res, 200, { overview });
    return;
  }

  if (segments.length === 1 && segments[0] === "households") {
    requireMethod(req, "GET");
    const households = await listHouseholdsForAdmin(db);
    sendJson(res, 200, { households });
    return;
  }

  if (segments.length === 2 && segments[0] === "households") {
    requireMethod(req, "GET");
    const detail = await getHouseholdDetailForAdmin(db, segments[1]);
    if (!detail) throw new HttpError(404, "Household not found.");
    sendJson(res, 200, detail);
    return;
  }

  throw new HttpError(404, "Not found.");
});
