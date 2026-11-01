import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, schema } from "./db/client.js";
import { eq, and, isNull, gt } from "drizzle-orm";

const SESSION_COOKIE = "kikapu_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not set (or too short). Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" ` +
        "and set it in your .env / Vercel project environment variables."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface SessionTokenPayload {
  sid: string; // session row id, allows server-side revocation
  uid: string; // user id
}

async function signSessionToken(payload: SessionTokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sid !== "string" || typeof payload.uid !== "string") return null;
    return { sid: payload.sid, uid: payload.uid };
  } catch {
    return null;
  }
}

/** Creates a DB-backed session (so logout / "sign out everywhere" actually revokes it) and returns a signed cookie value. */
export async function createSession(userId: string, userAgent: string | null): Promise<string> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const [session] = await db
    .insert(schema.sessions)
    .values({ userId, expiresAt, userAgent })
    .returning();
  return signSessionToken({ sid: session.id, uid: userId });
}

export async function revokeSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.id, sessionId));
}

export interface AuthContext {
  userId: string;
  sessionId: string;
  householdId: string;
}

/**
 * Resolves the authenticated user + their (first/owning) household from the
 * request cookie. Returns null if unauthenticated or the session was
 * revoked/expired; callers must treat null as 401, never assume a user.
 */
export async function getAuthContext(req: VercelRequest): Promise<AuthContext | null> {
  const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const db = getDb();
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.id, payload.sid),
        isNull(schema.sessions.revokedAt),
        gt(schema.sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session || session.userId !== payload.uid) return null;

  const [membership] = await db
    .select({ householdId: schema.householdMembers.householdId })
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, payload.uid))
    .limit(1);

  if (!membership) return null;

  return { userId: payload.uid, sessionId: session.id, householdId: membership.householdId };
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

export function clearSessionCookie(res: VercelResponse) {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=0`);
}

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
