import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { provisionHousehold } from "../../lib/db/provisionHousehold.js";
import { hashPassword, createSession, setSessionCookie } from "../../lib/auth.js";
import { withApi, requireMethod, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { enforceRateLimit } from "../../lib/rateLimit.js";
import { registerSchema } from "../../shared/validation/schemas.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  await enforceRateLimit(`register:ip:${ip}`, 10, 60 * 60);

  const input = parseBody(registerSchema, req);
  const db = getDb();

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
  if (existing) {
    throw new HttpError(409, "An account with this email already exists.", { email: "Already registered." });
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(schema.users)
    .values({ email: input.email, passwordHash, displayName: input.displayName })
    .returning();

  await db.insert(schema.userPreferences).values({ userId: user.id });
  await provisionHousehold(db, user.id);

  const token = await createSession(user.id, req.headers["user-agent"] ?? null);
  setSessionCookie(res, token);

  const payload = await getPublicUserPayload(db, user.id);
  sendJson(res, 201, { user: payload });
});
