"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ApertureLine } from "@/components/brand/ApertureLine";
import { fmtCi, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * KpiCard — overline label, big count-up numeral (reduced-motion aware),
 * optional CI + n sub-line, optional delta with direction glyph.
 * loading / null value → "—" + Pending chip. Never a bare number.
 */
export function KpiCard({
  label,
  value,
  decimals = 0,
  ci,
  n,
  delta,
  loading = false,
  footer,
  className,
}: {
  label: string;
  value: number | null;
  decimals?: number;
  ci?: readonly [number, number];
  n?: number;
  delta?: { value: number; label: string };
  loading?: boolean;
  footer?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v: number) => v.toFixed(decimals));
  const pending = loading || value == null || !Number.isFinite(value);

  useEffect(() => {
    if (pending) return;
    const target = value as number;
    if (reduce) {
      mv.set(target);
      return;
    }
    const controls = animate(mv, target, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, pending, reduce, mv]);

  const subParts: string[] = [];
  if (ci) subParts.push(`95% CI ${fmtCi(ci)}`);
  if (n != null) subParts.push(`n = ${fmtInt(n)}`);

  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-md border border-hairline bg-card p-5 transition-[border-color,background-color] duration-200 ease-silk hover:border-gold-700",
        className,
      )}
    >
      <ApertureLine className="absolute inset-x-0 top-0" />
      <div aria-hidden className="grad-sheen pointer-events-none absolute inset-0" />
      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">
          {label}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          {pending ? (
            <span className="num font-display text-[2.25rem] leading-none text-ink-4">—</span>
          ) : (
            <motion.span className="num font-display text-[2.25rem] leading-none text-ink-1">
              {text}
            </motion.span>
          )}
          {pending ? (
            <span className="rounded-xs border border-hairline-strong px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-3">
              Pending
            </span>
          ) : null}
        </div>
        {subParts.length > 0 ? (
          <p className="num mt-2 text-xs text-ink-3">{subParts.join(" · ")}</p>
        ) : null}
        {delta && !pending ? (
          <p
            className={cn(
              "num mt-1.5 text-xs",
              delta.value >= 0 ? "text-emerald" : "text-ruby",
            )}
          >
            {delta.value >= 0 ? "▲" : "▼"} {delta.label}
          </p>
        ) : null}
        {footer}
      </div>
    </section>
  );
}
