import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db/client.js";
import { withApi, requireAuth, requireMethod, parseQuery } from "../../lib/http.js";
import { minorToDecimalString } from "../../shared/money.js";

const querySchema = z.object({ format: z.enum(["json", "csv"]).default("json") });

export default withApi(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const ctx = await requireAuth(req);
  const { format } = parseQuery(querySchema, req);
  const db = getDb();

  const receipts = await db
    .select()
    .from(schema.receipts)
    .where(eq(schema.receipts.householdId, ctx.householdId))
    .orderBy(asc(schema.receipts.purchasedAt));

  const items = await db
    .select()
    .from(schema.receiptItems)
    .innerJoin(schema.receipts, eq(schema.receiptItems.receiptId, schema.receipts.id))
    .where(eq(schema.receipts.householdId, ctx.householdId));

  if (format === "csv") {
    const header = "receipt_date,merchant,product,quantity,unit_price,line_total,receipt_total\n";
    const lines = items.map((row) => {
      const i = row.receipt_items;
      const r = row.receipts;
      return [
        r.purchasedAt.toISOString().slice(0, 10),
        csvEscape(r.merchantNameRaw),
        csvEscape(i.rawDescription),
        i.quantity,
        minorToDecimalString(i.unitPriceMinor),
        minorToDecimalString(i.lineTotalMinor),
        minorToDecimalString(r.totalMinor),
      ].join(",");
    });
    res.status(200).setHeader("Content-Type", "text/csv").setHeader("Content-Disposition", "attachment; filename=kikapu-export.csv");
    res.send(header + lines.join("\n"));
    return;
  }

  res
    .status(200)
    .setHeader("Content-Type", "application/json")
    .setHeader("Content-Disposition", "attachment; filename=kikapu-export.json")
    .send(JSON.stringify({ exportedAt: new Date().toISOString(), receipts }, null, 2));
});

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
