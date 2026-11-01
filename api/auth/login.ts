import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { verifyPassword, createSession, setSessionCookie } from "../../lib/auth.js";
import { withApi, requireMethod, parseBody, sendJson, HttpError } from "../../lib/http.js";
import { enforceRateLimit } from "../../lib/rateLimit.js";
import { loginSchema } from "../../shared/validation/schemas.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const input = parseBody(loginSchema, req);

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  await enforceRateLimit(`login:ip:${ip}`, 20, 15 * 60);
  await enforceRateLimit(`login:email:${input.email}`, 8, 15 * 60);

  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1);

  const genericError = () => new HttpError(401, "Incorrect email or password.");
  if (!user || user.deletedAt) throw genericError();

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw genericError();

  const token = await createSession(user.id, req.headers["user-agent"] ?? null);
  setSessionCookie(res, token);

  const payload = await getPublicUserPayload(db, user.id);
  sendJson(res, 200, { user: payload });
});
