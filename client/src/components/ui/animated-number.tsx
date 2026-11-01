import { useEffect, useRef, useState } from "react";
import { useReducedMotionPref } from "@/hooks/useReducedMotion";

/**
 * Animates a number counting up to `value` on mount/change. Respects
 * prefers-reduced-motion (jumps straight to the final value).
 */
export function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
  durationMs = 700,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
}) {
  const reducedMotion = useReducedMotionPref();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    fromRef.current = display;
    startRef.current = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion]);

  return <span>{format(display)}</span>;
}
