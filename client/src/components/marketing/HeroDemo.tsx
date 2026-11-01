import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, CheckCircle2, TrendingUp } from "lucide-react";
import { DEMO_RECEIPT_LINES, DEMO_ITEMS, DEMO_TOTAL_MINOR } from "@/lib/demoData";
import { formatMoney } from "@shared/money";
import { useReducedMotionPref } from "@/hooks/useReducedMotion";

const STAGES = ["scan", "extract", "insight"] as const;

/** Auto-cycling illustration: receipt photo -> extracted line items -> dashboard insight. */
export function HeroDemo() {
  const reducedMotion = useReducedMotionPref();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => setStageIndex((i) => (i + 1) % STAGES.length), 3200);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const stage = STAGES[reducedMotion ? 2 : stageIndex];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent/10 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft-lg">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
          </div>
          <span className="ml-2 text-xs font-medium text-muted-foreground">Kikapu</span>
        </div>

        <div className="relative h-[22rem] overflow-hidden p-4">
          <AnimatePresence mode="wait">
            {stage === "scan" && (
              <motion.div
                key="scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center gap-4"
              >
                <div className="relative w-56 rounded-lg border border-border bg-background p-3 font-mono text-[0.55rem] leading-[0.9rem] text-foreground/70 shadow-soft">
                  {DEMO_RECEIPT_LINES.map((line, i) => (
                    <div key={i} className="truncate">
                      {line}
                    </div>
                  ))}
                  <motion.div
                    className="absolute inset-x-0 h-10 bg-gradient-to-b from-accent/0 via-accent/30 to-accent/0"
                    animate={{ top: ["0%", "95%"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                  <ScanLine className="size-4" /> Scanning receipt…
                </div>
              </motion.div>
            )}

            {stage === "extract" && (
              <motion.div key="extract" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col gap-2 py-2">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="size-4" /> Extracted 5 items
                </div>
                {DEMO_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{formatMoney(item.lineTotalMinor)}</span>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-2 flex items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <span>Total</span>
                  <span>{formatMoney(DEMO_TOTAL_MINOR)}</span>
                </motion.div>
              </motion.div>
            )}

            {stage === "insight" && (
              <motion.div key="insight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col justify-center gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <TrendingUp className="size-4" /> This week's spending
                </div>
                <div className="flex items-end gap-2 h-32">
                  {[40, 0, 70, 20, 0, 85, 60].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="flex-1 rounded-t-md bg-accent/70"
                    />
                  ))}
                </div>
                <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  You've spent <strong className="text-foreground">{formatMoney(DEMO_TOTAL_MINOR)}</strong> today across{" "}
                  <strong className="text-foreground">5 items</strong> — groceries made up most of it.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
