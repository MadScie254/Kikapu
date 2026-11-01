import { useState } from "react";
import { Search, Store as StoreIcon, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useStores, usePriceHistory } from "@/hooks/useStores";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatMoney } from "@shared/money";
import { formatHumanDate } from "@shared/dates";

export default function Stores() {
  const { data: stores, isLoading } = useStores();
  const [productQuery, setProductQuery] = useState("");
  const debouncedQuery = useDebouncedValue(productQuery, 400);
  const { data: priceHistory, isFetching } = usePriceHistory(debouncedQuery);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Stores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Where you shop, and what you've historically paid.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price History Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search a product, e.g. Cooking Oil" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
          </div>

          {debouncedQuery.length > 1 && (
            <div className="mt-4">
              {isFetching ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : priceHistory && priceHistory.history.length > 0 ? (
                <div className="space-y-2">
                  {priceHistory.cheapestStore && (
                    <Badge variant="success" className="mb-2">
                      Historically cheapest at {priceHistory.cheapestStore.merchantName}: {formatMoney(priceHistory.cheapestStore.unitPriceMinor)}
                    </Badge>
                  )}
                  {priceHistory.history.slice(0, 8).map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{h.merchantName}</p>
                        <p className="text-xs text-muted-foreground">{formatHumanDate(new Date(h.purchasedAt))} · {h.description}</p>
                      </div>
                      <span className="font-semibold">{formatMoney(h.unitPriceMinor)}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    These are prices you've previously paid; not live prices at any store today.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No purchase history found for that product yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display text-lg font-semibold">Your Stores</h2>
        <div className="mt-3 space-y-3">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

          {!isLoading && stores?.length === 0 && (
            <EmptyState icon={<StoreIcon className="size-6" />} title="No stores yet" description="Once you save a receipt, the store will show up here." />
          )}

          {stores?.map((store) => (
            <Card key={store.merchantId}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{store.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    {store.location && (
                      <>
                        <MapPin className="size-3" /> {store.location} ·
                      </>
                    )}
                    {store.visitCount} visit{store.visitCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="font-display font-bold">{formatMoney(store.totalSpentMinor)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
