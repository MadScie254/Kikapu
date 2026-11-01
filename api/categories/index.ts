import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { categoryInputSchema } from "../../shared/validation/schemas.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const ctx = await requireAuth(req);
  const db = getDb();

  if (req.method === "GET") {
    // Returns ALL categories (active and inactive), not just active ones:
    // the scan review screen needs every category to resolve a guessed slug
    // to an id even if the user deselected it during onboarding. Callers
    // that only want visible options (e.g. the budgets page) should filter
    // on `isActive` themselves.
    const rows = await db
      .select()
      .from(schema.categories)
      .where(and(eq(schema.categories.householdId, ctx.householdId), eq(schema.categories.isOverall, false)))
      .orderBy(asc(schema.categories.name));
    sendJson(res, 200, { categories: rows });
    return;
  }

  if (req.method === "POST") {
    const input = parseBody(categoryInputSchema, req);
    const slug = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const [created] = await db
      .insert(schema.categories)
      .values({
        householdId: ctx.householdId,
        slug: `${slug}-${Date.now().toString(36)}`,
        name: input.name,
        icon: input.icon,
        color: input.color,
        isDefault: false,
        isOverall: false,
        isActive: true,
      })
      .returning();
    sendJson(res, 201, { category: created });
    return;
  }

  throw new HttpError(405, `Method ${req.method} not allowed`);
});
