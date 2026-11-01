import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Plus, Loader2, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useReceipt, useDeleteReceipt, useUpdateReceipt } from "@/hooks/useReceipts";
import { formatMoney, toMinorUnits, minorToDecimalString, addMoney } from "@shared/money";
import { formatHumanDateTime } from "@shared/dates";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: receipt, isLoading } = useReceipt(id);
  const deleteMutation = useDeleteReceipt();
  const updateMutation = useUpdateReceipt(id!);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [merchantName, setMerchantName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { key: string; rawDescription: string; quantity: string; unitPriceMinor: string }[]
  >([]);

  useEffect(() => {
    if (!receipt) return;
    setMerchantName(receipt.merchantNameRaw);
    setNotes(receipt.notes ?? "");
    setItems(
      receipt.items.map((i) => ({
        key: i.id,
        rawDescription: i.rawDescription,
        quantity: String(i.quantity),
        unitPriceMinor: minorToDecimalString(i.unitPriceMinor),
      }))
    );
  }, [receipt]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Receipt not found. <Button variant="link" onClick={() => navigate("/app/receipts")}>Back to transactions</Button>
      </div>
    );
  }

  // Closures defined below (save/handleDelete) don't retain the narrowing
  // from the guard above, so capture a definitely-non-null reference here.
  const current = receipt;

  const lineTotals = items.map((i) => Math.round((parseFloat(i.quantity) || 0) * toMinorUnits(i.unitPriceMinor || "0")));
  const subtotalMinor = addMoney(...lineTotals);

  async function save() {
    try {
      await updateMutation.mutateAsync({
        merchantNameRaw: merchantName,
        notes: notes || null,
        subtotalMinor,
        totalMinor: addMoney(subtotalMinor, current.discountMinor * -1, current.taxMinor, current.otherChargesMinor),
        items: items
          .filter((i) => i.rawDescription.trim())
          .map((i, idx) => ({
            rawDescription: i.rawDescription,
            normalizedName: i.rawDescription,
            quantity: parseFloat(i.quantity) || 1,
            unitPriceMinor: toMinorUnits(i.unitPriceMinor || "0"),
            lineTotalMinor: lineTotals[idx],
          })),
      });
      toast({ title: "Receipt updated", variant: "success" });
      setEditing(false);
    } catch {
      toast({ title: "Couldn't save changes", variant: "destructive" });
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(current.id);
      toast({ title: "Receipt deleted", variant: "success" });
      navigate("/app/receipts");
    } catch {
      toast({ title: "Couldn't delete receipt", variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/receipts")} className="-ml-2 mb-4">
        <ArrowLeft className="size-4" /> Back
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div>
          {editing ? (
            <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} className="font-display text-xl font-bold" />
          ) : (
            <h1 className="font-display text-2xl font-bold">{receipt.merchantNameRaw}</h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{formatHumanDateTime(new Date(receipt.purchasedAt))}</p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button variant="outline" size="icon" onClick={() => setEditing(true)} aria-label="Edit">
              <Pencil className="size-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={save} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{receipt.source === "market" ? "Open-Air Market" : receipt.source === "manual" ? "Manual Entry" : "Scanned"}</Badge>
        {receipt.paymentMethod && <Badge variant="outline">{receipt.paymentMethod}</Badge>}
        {!!receipt.totalDiscrepancyMinor && Math.abs(receipt.totalDiscrepancyMinor) > 100 && (
          <Badge variant="warning">Total mismatch: {formatMoney(Math.abs(receipt.totalDiscrepancyMinor))}</Badge>
        )}
      </div>

      {receipt.imageUrl && (
        <Card className="mt-5">
          <CardContent className="p-3">
            <img src={`/api/receipts/${receipt.id}/image`} alt="Receipt" className="w-full rounded-lg object-contain" />
          </CardContent>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.key} className="flex items-center gap-2">
              {editing ? (
                <>
                  <Input
                    className="flex-1"
                    value={item.rawDescription}
                    onChange={(e) => setItems((prev) => prev.map((i, j) => (j === idx ? { ...i, rawDescription: e.target.value } : i)))}
                  />
                  <Input
                    className="w-16"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => setItems((prev) => prev.map((i, j) => (j === idx ? { ...i, quantity: e.target.value } : i)))}
                  />
                  <Input
                    className="w-24"
                    type="number"
                    step="0.01"
                    value={item.unitPriceMinor}
                    onChange={(e) => setItems((prev) => prev.map((i, j) => (j === idx ? { ...i, unitPriceMinor: e.target.value } : i)))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, j) => j !== idx))}>
                    <Trash2 className="size-4" />
                  </Button>
                </>
              ) : (
                <div className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.rawDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatMoney(toMinorUnits(item.unitPriceMinor))}
                    </p>
                  </div>
                  <span className="font-semibold">{formatMoney(lineTotals[idx])}</span>
                </div>
              )}
            </div>
          ))}
          {editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { key: crypto.randomUUID(), rawDescription: "", quantity: "1", unitPriceMinor: "" }])}
            >
              <Plus className="size-4" /> Add item
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardContent className="space-y-2 p-5 text-sm">
          <Row label="Subtotal" value={formatMoney(receipt.subtotalMinor)} />
          {receipt.discountMinor > 0 && <Row label="Discount" value={`-${formatMoney(receipt.discountMinor)}`} />}
          {receipt.taxMinor > 0 && <Row label="VAT / Tax" value={formatMoney(receipt.taxMinor)} />}
          <div className="flex items-center justify-between border-t border-border pt-2 font-display text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(receipt.totalMinor)}</span>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <div className="mt-5 space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
      {!editing && receipt.notes && (
        <Alert className="mt-5">
          <AlertDescription>{receipt.notes}</AlertDescription>
        </Alert>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this receipt?</DialogTitle>
            <DialogDescription>
              This permanently removes {receipt.merchantNameRaw} ({formatMoney(receipt.totalMinor)}) and its items. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
