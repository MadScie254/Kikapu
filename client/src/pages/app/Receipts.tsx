import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Receipt as ReceiptIcon, ChevronLeft, ChevronRight, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReceiptsList } from "@/hooks/useReceipts";
import { useCategories } from "@/hooks/useCategories";
import { formatMoney } from "@shared/money";
import { formatHumanDate } from "@shared/dates";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 15;

export default function Receipts() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useCategories();
  const { data, isLoading } = useReceiptsList({
    search: search || undefined,
    categoryId: categoryId === "all" ? undefined : categoryId,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every receipt and purchase you've saved.</p>
        </div>
        <Button onClick={() => navigate("/app/scan")}>
          <ScanLine className="size-4" /> Scan Receipt
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by store or product…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.filter((c) => !c.isOverall).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest first</SelectItem>
            <SelectItem value="date_asc">Oldest first</SelectItem>
            <SelectItem value="amount_desc">Highest amount</SelectItem>
            <SelectItem value="amount_asc">Lowest amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!isLoading && data?.receipts.length === 0 && (
          <EmptyState
            icon={<ReceiptIcon className="size-6" />}
            title="No transactions yet"
            description="Scan your first receipt or log a market purchase to see it here."
            action={
              <Button onClick={() => navigate("/app/scan")}>
                <ScanLine className="size-4" /> Scan Your First Receipt
              </Button>
            }
          />
        )}

        {data?.receipts.map((receipt) => (
          <Card
            key={receipt.id}
            className="cursor-pointer transition-shadow hover:shadow-soft-lg"
            onClick={() => navigate(`/app/receipts/${receipt.id}`)}
          >
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{receipt.merchantNameRaw}</p>
                <p className="text-xs text-muted-foreground">
                  {formatHumanDate(new Date(receipt.purchasedAt))} · {receipt.itemCount} item{receipt.itemCount === 1 ? "" : "s"}
                  {receipt.source === "market" && " · Market"}
                </p>
              </div>
              <span className="shrink-0 font-display font-bold">{formatMoney(receipt.totalMinor)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
