import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useCategories } from "@/hooks/useCategories";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney, minorToDecimalString, toMinorUnits, addMoney, reconcileReceiptTotal } from "@shared/money";
import { guessCategorySlug } from "@shared/categories";
import type { ParsedReceiptResult } from "@shared/parsing/types";
import type { Receipt } from "@shared/types";
import { saveOfflineDraft } from "@/lib/offlineDrafts";

export interface EditableItem {
  key: string;
  rawDescription: string;
  quantity: string;
  unitPriceMinor: string; // decimal string for the input
  categorySlug: string;
  isUncertain: boolean;
  uncertainReason?: string;
}

interface ReviewStepProps {
  parsed: ParsedReceiptResult | null;
  source: "ocr" | "manual";
  rawOcrText?: string | null;
  uploadedImagePath?: string | null;
  onDone: () => void;
}

function newItem(partial?: Partial<EditableItem>): EditableItem {
  return {
    key: crypto.randomUUID(),
    rawDescription: "",
    quantity: "1",
    unitPriceMinor: "",
    categorySlug: "other",
    isUncertain: false,
    ...partial,
  };
}

export function ReviewStep({ parsed, source, rawOcrText, uploadedImagePath, onDone }: ReviewStepProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();

  const [merchantName, setMerchantName] = useState(parsed?.merchantNameRaw ?? "");
  const [purchasedAt, setPurchasedAt] = useState(() => toLocalInputValue(parsed?.purchasedAt ?? new Date()));
  const [receiptNumber, setReceiptNumber] = useState(parsed?.receiptNumber ?? "");
  const [paymentMethod, setPaymentMethod] = useState(parsed?.paymentMethod ?? "");
  const [notes, setNotes] = useState("");
  const [discountInput, setDiscountInput] = useState(parsed?.discountMinor ? minorToDecimalString(parsed.discountMinor) : "0");
  const [taxInput, setTaxInput] = useState(parsed?.taxMinor ? minorToDecimalString(parsed.taxMinor) : "0");
  const [printedTotalInput, setPrintedTotalInput] = useState(
    parsed?.printedTotalMinor != null ? minorToDecimalString(parsed.printedTotalMinor) : ""
  );
  const [items, setItems] = useState<EditableItem[]>(
    parsed?.items.length
      ? parsed.items.map((i) =>
          newItem({
            rawDescription: i.description,
            quantity: String(i.quantity),
            unitPriceMinor: minorToDecimalString(i.unitPriceMinor),
            categorySlug: i.categorySlug,
            isUncertain: i.isUncertain,
            uncertainReason: i.uncertainReason,
          })
        )
      : [newItem()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: string; merchantNameRaw: string; purchasedAt: string; totalMinor: number } | null>(
    null
  );

  const lineTotals = items.map((i) => {
    const qty = parseFloat(i.quantity) || 0;
    const price = toMinorUnits(i.unitPriceMinor || "0");
    return Math.round(qty * price);
  });
  const subtotalMinor = addMoney(...lineTotals);
  const discountMinor = toMinorUnits(discountInput || "0");
  const taxMinor = toMinorUnits(taxInput || "0");
  const printedTotalMinor = printedTotalInput ? toMinorUnits(printedTotalInput) : null;

  const reconciliation = useMemo(
    () =>
      reconcileReceiptTotal({
        lineItemsSum: subtotalMinor,
        discounts: discountMinor,
        tax: taxMinor,
        otherCharges: 0,
        printedTotal: printedTotalMinor,
      }),
    [subtotalMinor, discountMinor, taxMinor, printedTotalMinor]
  );

  const totalMinor = printedTotalMinor ?? reconciliation.computedTotal;

  function updateItem(key: string, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch, isUncertain: false, uncertainReason: undefined } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function buildPayload(acknowledgeDuplicate: boolean) {
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id] as const));
    return {
      merchantNameRaw: merchantName.trim() || "Unknown Merchant",
      purchasedAt: new Date(purchasedAt).toISOString(),
      receiptNumber: receiptNumber.trim() || null,
      subtotalMinor,
      discountMinor,
      taxMinor,
      otherChargesMinor: 0,
      totalMinor,
      printedTotalMinor,
      paymentMethod: paymentMethod.trim() || null,
      source,
      notes: notes.trim() || null,
      rawOcrText: rawOcrText ?? null,
      imageBlobPath: uploadedImagePath ?? null,
      shoppingListId: null,
      acknowledgeDuplicate,
      items: items
        .filter((i) => i.rawDescription.trim())
        .map((i, idx) => ({
          rawDescription: i.rawDescription.trim(),
          normalizedName: i.rawDescription.trim(),
          quantity: parseFloat(i.quantity) || 1,
          unitPriceMinor: toMinorUnits(i.unitPriceMinor || "0"),
          lineTotalMinor: lineTotals[idx],
          categoryId: categoryBySlug.get(i.categorySlug) ?? categoryBySlug.get("other") ?? null,
          isUncertain: i.isUncertain,
        })),
    };
  }

  async function submit(acknowledgeDuplicate = false) {
    if (!merchantName.trim()) {
      toast({ title: "Add a store name", description: "Who did you buy this from?", variant: "destructive" });
      return;
    }
    if (!items.some((i) => i.rawDescription.trim())) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const payload = buildPayload(acknowledgeDuplicate);
    try {
      const result = await api.post<{ receipt?: Receipt; possibleDuplicate?: typeof duplicateInfo }>("/receipts", payload);
      if (result.possibleDuplicate) {
        setDuplicateInfo(result.possibleDuplicate);
        setSubmitting(false);
        return;
      }
      toast({ title: "Receipt saved", description: `${formatMoney(totalMinor)} at ${merchantName}`, variant: "success" });
      onDone();
      navigate("/app/receipts");
    } catch (err) {
      if (err instanceof TypeError || !navigator.onLine) {
        await saveOfflineDraft(payload as any);
        toast({
          title: "Saved offline",
          description: "No connection right now; this will sync automatically once you're back online.",
        });
        onDone();
        navigate("/app/receipts");
        return;
      }
      toast({
        title: "Couldn't save receipt",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {parsed?.warnings.map((w, i) => (
        <Alert key={i} variant="warning">
          <AlertTriangle />
          <AlertDescription>{w}</AlertDescription>
        </Alert>
      ))}

      {printedTotalMinor != null && !reconciliation.matches && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertDescription>
            The printed total ({formatMoney(printedTotalMinor)}) doesn't match the items (
            {formatMoney(reconciliation.computedTotal)}). Difference: {formatMoney(Math.abs(reconciliation.discrepancy))}. Double-check
            the amounts below, or save anyway if it looks right.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receipt details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Store</Label>
            <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="e.g. Naivas Supermarket" />
          </div>
          <div className="space-y-1.5">
            <Label>Date & time</Label>
            <Input type="datetime-local" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Cash, M-Pesa, Card…" />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt number (optional)</Label>
            <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className={`rounded-lg border p-3 ${item.isUncertain ? "border-warning/50 bg-warning/5" : "border-border"}`}>
              <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
                <Input
                  value={item.rawDescription}
                  onChange={(e) => updateItem(item.key, { rawDescription: e.target.value, categorySlug: guessCategorySlug(e.target.value) })}
                  placeholder="Item name"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                  aria-label="Quantity"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPriceMinor}
                  onChange={(e) => updateItem(item.key, { unitPriceMinor: e.target.value })}
                  placeholder="Unit price"
                  aria-label="Unit price"
                />
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.key)} aria-label="Remove item">
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Select value={item.categorySlug} onValueChange={(v) => updateItem(item.key, { categorySlug: v })}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => !c.isOverall)
                      .map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <span className="text-sm font-semibold">
                  {formatMoney(Math.round((parseFloat(item.quantity) || 0) * toMinorUnits(item.unitPriceMinor || "0")))}
                </span>
              </div>
              {item.uncertainReason && <p className="mt-1 text-xs text-warning-foreground/80">{item.uncertainReason}</p>}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-4" /> Add item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Items subtotal" value={formatMoney(subtotalMinor)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Input type="number" min="0" step="0.01" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>VAT / Tax</Label>
              <Input type="number" min="0" step="0.01" value={taxInput} onChange={(e) => setTaxInput(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Printed total (optional, for verification)</Label>
            <Input type="number" min="0" step="0.01" value={printedTotalInput} onChange={(e) => setPrintedTotalInput(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
            <span className="font-semibold">Total</span>
            <span className="font-display text-lg font-bold">{formatMoney(totalMinor)}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this trip" />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-center lg:static lg:justify-end">
        <Button size="lg" className="w-full shadow-soft-lg lg:w-auto" onClick={() => submit(false)} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Transaction
        </Button>
      </div>

      <Dialog open={!!duplicateInfo} onOpenChange={(open) => !open && setDuplicateInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>This looks like a possible duplicate</DialogTitle>
            <DialogDescription>
              {duplicateInfo && (
                <>
                  You already have a receipt from <strong>{duplicateInfo.merchantNameRaw}</strong> on{" "}
                  {new Date(duplicateInfo.purchasedAt).toLocaleDateString()} for {formatMoney(duplicateInfo.totalMinor)}. Save this one
                  anyway?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateInfo(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDuplicateInfo(null);
                submit(true);
              }}
            >
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function toLocalInputValue(date: Date): string {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
