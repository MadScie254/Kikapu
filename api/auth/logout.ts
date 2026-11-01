import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthContext, clearSessionCookie, revokeSession } from "../../lib/auth.js";
import { withApi, requireMethod, sendJson } from "../../lib/http.js";

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const ctx = await getAuthContext(req);
  if (ctx) await revokeSession(ctx.sessionId);
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
});
