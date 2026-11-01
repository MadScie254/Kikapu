import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { provisionHousehold } from "../../lib/db/provisionHousehold.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getAuthContext,
  revokeSession,
} from "../../lib/auth.js";
import { withApi, requireMethod, parseBody, sendJson, requireAuth, HttpError } from "../../lib/http.js";
import { enforceRateLimit } from "../../lib/rateLimit.js";
import { registerSchema, loginSchema } from "../../shared/validation/schemas.js";
import { getPublicUserPayload } from "../../lib/db/queries/userQueries.js";

/**
 * Consolidated auth routes; /api/auth/register, /login, /logout, /me -
 * combined into one Vercel function (instead of four) to stay under the
 * Hobby plan's 12-serverless-function-per-deployment limit. The public
 * URL paths are unchanged.
 */
export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  const action = req.query.action as string;
  const db = getDb();

  if (action === "register") {
    requireMethod(req, "POST");
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
    await enforceRateLimit(`register:ip:${ip}`, 10, 60 * 60);

    const input = parseBody(registerSchema, req);
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
    return;
  }

  if (action === "login") {
    requireMethod(req, "POST");
    const input = parseBody(loginSchema, req);

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
    await enforceRateLimit(`login:ip:${ip}`, 20, 15 * 60);
    await enforceRateLimit(`login:email:${input.email}`, 8, 15 * 60);

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
    const genericError = () => new HttpError(401, "Incorrect email or password.");
    if (!user || user.deletedAt) throw genericError();

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw genericError();

    const token = await createSession(user.id, req.headers["user-agent"] ?? null);
    setSessionCookie(res, token);

    const payload = await getPublicUserPayload(db, user.id);
    sendJson(res, 200, { user: payload });
    return;
  }

  if (action === "logout") {
    requireMethod(req, "POST");
    const ctx = await getAuthContext(req);
    if (ctx) await revokeSession(ctx.sessionId);
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (action === "me") {
    requireMethod(req, "GET");
    const ctx = await requireAuth(req);
    const payload = await getPublicUserPayload(db, ctx.userId);
    sendJson(res, 200, { user: payload });
    return;
  }

  throw new HttpError(404, "Not found.");
});
