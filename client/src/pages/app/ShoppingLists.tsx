import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ListChecks, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useShoppingLists, useCreateShoppingList, useDeleteShoppingList } from "@/hooks/useShoppingLists";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@shared/money";
import { Progress } from "@/components/ui/progress";

export default function ShoppingLists() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: lists, isLoading } = useShoppingLists();
  const createMutation = useCreateShoppingList();
  const deleteMutation = useDeleteShoppingList();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const { list } = await createMutation.mutateAsync(name.trim());
      setCreating(false);
      setName("");
      navigate(`/app/shopping-lists/${list.id}`);
    } catch {
      toast({ title: "Couldn't create list", variant: "destructive" });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Shopping Lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan your next trip with estimated costs.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New List
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

        {!isLoading && lists?.length === 0 && (
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title="No shopping lists yet"
            description="Create one to plan your next trip, with cost estimates from your own purchase history."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create a List
              </Button>
            }
          />
        )}

        {lists?.map((list) => (
          <Card key={list.id} className="cursor-pointer transition-shadow hover:shadow-soft-lg" onClick={() => navigate(`/app/shopping-lists/${list.id}`)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{list.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(list.id);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {list.purchasedCount}/{list.itemCount} purchased · Est. {formatMoney(list.estimatedTotalMinor)}
              </p>
              {list.itemCount > 0 && <Progress className="mt-2" value={(list.purchasedCount / list.itemCount) * 100} />}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New shopping list</DialogTitle>
          </DialogHeader>
          <Input placeholder="e.g. This Week" value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
