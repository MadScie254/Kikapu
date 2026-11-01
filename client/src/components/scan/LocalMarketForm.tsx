import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useCategories } from "@/hooks/useCategories";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney, toMinorUnits, addMoney } from "@shared/money";
import type { Receipt } from "@shared/types";

interface MarketRow {
  key: string;
  name: string;
  priceInput: string;
}

function newRow(): MarketRow {
  return { key: crypto.randomUUID(), name: "", priceInput: "" };
}

/** Quick manual entry for open-air market / small-shop purchases that never issue a receipt. */
export function LocalMarketForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const [merchantName, setMerchantName] = useState("Open-Air Market");
  const [rows, setRows] = useState<MarketRow[]>([newRow(), newRow(), newRow()]);
  const [submitting, setSubmitting] = useState(false);

  const totalMinor = addMoney(...rows.map((r) => toMinorUnits(r.priceInput || "0")));

  function updateRow(key: string, patch: Partial<MarketRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function submit() {
    const validRows = rows.filter((r) => r.name.trim() && r.priceInput);
    if (validRows.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const marketCategory = categories.find((c) => c.slug === "market");
    setSubmitting(true);
    try {
      await api.post<{ receipt: Receipt }>("/receipts", {
        merchantNameRaw: merchantName.trim() || "Open-Air Market",
        purchasedAt: new Date().toISOString(),
        subtotalMinor: totalMinor,
        discountMinor: 0,
        taxMinor: 0,
        otherChargesMinor: 0,
        totalMinor,
        printedTotalMinor: null,
        source: "market",
        items: validRows.map((r) => ({
          rawDescription: r.name.trim(),
          normalizedName: r.name.trim(),
          quantity: 1,
          unitPriceMinor: toMinorUnits(r.priceInput),
          lineTotalMinor: toMinorUnits(r.priceInput),
          categoryId: marketCategory?.id ?? null,
        })),
      });
      toast({ title: "Purchase saved", description: formatMoney(totalMinor), variant: "success" });
      onDone();
      navigate("/app/receipts");
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label>Where did you shop?</Label>
          <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="e.g. Kawangware Market" />
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="e.g. Tomatoes"
                value={row.name}
                onChange={(e) => updateRow(row.key, { name: e.target.value })}
              />
              <Input
                className="w-28"
                type="number"
                min="0"
                step="0.01"
                placeholder="KSh"
                value={row.priceInput}
                onChange={(e) => updateRow(row.key, { priceInput: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, newRow()])}>
            <Plus className="size-4" /> Add item
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
          <span className="font-semibold">Total</span>
          <span className="font-display text-lg font-bold">{formatMoney(totalMinor)}</span>
        </div>

        <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Save Purchase
        </Button>
      </CardContent>
    </Card>
  );
}
