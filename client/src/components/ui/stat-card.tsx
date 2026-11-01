import type { ReactNode } from "react";
import { Card, CardContent } from "./card";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label,
  valueMinor,
  formatValue,
  icon,
  trend,
  accent = false,
  className,
}: {
  label: string;
  valueMinor: number;
  formatValue: (n: number) => string;
  icon?: ReactNode;
  trend?: { direction: "up" | "down"; label: string } | null;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && (
            <div className={cn("flex size-9 items-center justify-center rounded-lg", accent ? "bg-accent/15 text-accent" : "bg-muted text-foreground")}>
              {icon}
            </div>
          )}
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          <AnimatedNumber value={valueMinor} format={formatValue} />
        </p>
        {trend && (
          <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", trend.direction === "up" ? "text-destructive" : "text-success")}>
            {trend.direction === "up" ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
