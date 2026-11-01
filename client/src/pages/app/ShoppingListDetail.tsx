import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useShoppingList,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useDeleteShoppingListItem,
} from "@/hooks/useShoppingLists";
import { formatMoney, toMinorUnits, addMoney } from "@shared/money";
import { cn } from "@/lib/utils";

export default function ShoppingListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: list, isLoading } = useShoppingList(id);
  const addItem = useAddShoppingListItem(id!);
  const updateItem = useUpdateShoppingListItem(id!);
  const deleteItem = useDeleteShoppingListItem(id!);

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");

  if (isLoading || !list) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const estimatedTotal = addMoney(...list.items.map((i) => (i.estimatedPriceMinor ?? 0) * Number(i.quantity)));

  async function handleAdd() {
    if (!newName.trim()) return;
    await addItem.mutateAsync({ name: newName.trim(), quantity: parseFloat(newQty) || 1 });
    setNewName("");
    setNewQty("1");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/shopping-lists")} className="-ml-2 mb-4">
        <ArrowLeft className="size-4" /> Back
      </Button>

      <h1 className="font-display text-2xl font-bold">{list.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Estimated total: {formatMoney(estimatedTotal)}</p>

      <Card className="mt-5">
        <CardContent className="space-y-2 p-4">
          {list.items
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <div key={item.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-2", item.purchased && "opacity-50")}>
                <Checkbox
                  checked={item.purchased}
                  onCheckedChange={(checked) => updateItem.mutate({ itemId: item.id, purchased: !!checked })}
                />
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", item.purchased && "line-through")}>{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {item.quantity}
                    {item.estimatedPriceMinor != null && (
                      <>
                        {" · "}
                        {formatMoney(item.estimatedPriceMinor)} each
                        {item.estimateSource === "historical" && (
                          <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[0.6rem]">
                            from history
                          </Badge>
                        )}
                        {item.estimateSource === "none" && " · no estimate available"}
                      </>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}

          {list.items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No items yet — add your first below.</p>}

          <div className="flex gap-2 pt-2">
            <Input placeholder="Add an item…" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            <Input className="w-16" type="number" min="1" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            <Button onClick={handleAdd}>
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
