import { ScanLine } from "lucide-react";

export function ProcessingStep({ statusLabel }: { statusLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <ScanLine className="size-8 animate-pulse" />
      </div>
      <div>
        <p className="font-display font-semibold">Reading your receipt…</p>
        <p className="mt-1 text-sm text-muted-foreground">{statusLabel}</p>
      </div>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
    </div>
  );
}
