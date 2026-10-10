"use client";

/**
 * Waterfall — the evidence waterfall. Cumulative log-odds from the base
 * rate through each feature contribution to the final probability.
 * Positive (toward risk) = ruby, negative (away) = sapphire; connectors
 * are hairlines; the final row is a champagne-outlined capsule with the
 * probability and its conformal interval. Rows stagger in 240 ms unless
 * reduced motion is requested.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PredictContribution } from "@/lib/client/api";
import { fmtCi, fmtP, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface WaterfallContribution {
  feature: string;
  value: string;
  contribution: number;
  direction: "toward_risk" | "away_from_risk";
}

const ROW_H = 36;
const LABEL_W = 232;
const RIGHT_W = 96;
const PAD = 24;

const logit = (p: number) => Math.log(p / (1 - p));

export function Waterfall({
  baseRate,
  contributions,
  finalProbability,
  interval,
  className,
}: {
  baseRate: number;
  contributions: WaterfallContribution[] | PredictContribution[];
  finalProbability: number;
  interval?: readonly [number, number] | null;
  className?: string;
}) {
  const reduce = useReducedMotion();

  const rows = useMemo(() => {
    const list = contributions.slice(0, 14);
    const start = logit(Math.min(0.999, Math.max(0.001, baseRate)));
    const built = list.map((c, i) => {
      const from = list.slice(0, i).reduce((s, x) => s + x.contribution, start);
      const to = from + c.contribution;
      return { ...c, from, to };
    });
    const cum = list.reduce((s, x) => s + x.contribution, start);
    const final = logit(Math.min(0.999, Math.max(0.001, finalProbability)));
    const residual = final - cum;
    if (Math.abs(residual) > 1e-6) {
      built.push({
        feature: "otherFactors",
        value: `Other factors (${list.length < contributions.length ? "aggregated" : "residual"})`,
        contribution: residual,
        direction: residual >= 0 ? "toward_risk" : "away_from_risk",
        from: cum,
        to: final,
      });
    }
    const values = [start, final, ...built.flatMap((r) => [r.from, r.to])];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.06, 0.15);
    return { built, start, final, xLo: lo - pad, xHi: hi + pad };
  }, [baseRate, contributions, finalProbability]);

  const height = PAD + rows.built.length * ROW_H + ROW_H + PAD;
  const xFor = (v: number) =>
    LABEL_W + ((v - rows.xLo) / (rows.xHi - rows.xLo)) * (760 - LABEL_W - RIGHT_W);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 760 ${height}`}
        className="w-full"
        role="img"
        aria-label={`Evidence waterfall from a base rate of ${fmtP(baseRate)} to an estimated probability of ${fmtP(finalProbability)}`}
      >
        {/* base-rate anchor */}
        <motion.g
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <line
            x1={xFor(rows.start)}
            y1={PAD - 4}
            x2={xFor(rows.start)}
            y2={height - PAD + 2}
            stroke="var(--text-4)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={xFor(rows.start)}
            y={PAD - 10}
            fontSize={10}
            fill="var(--text-3)"
            textAnchor="middle"
            fontFamily="var(--font-geist-mono)"
          >
            base rate {fmtP(baseRate)}
          </text>
        </motion.g>

        {rows.built.map((row, i) => {
          const y = PAD + i * ROW_H;
          const x0 = xFor(Math.min(row.from, row.to));
          const x1 = xFor(Math.max(row.from, row.to));
          const positive = row.contribution >= 0;
          const color = positive ? "var(--ruby)" : "var(--sapphire)";
          const prevEnd = i === 0 ? rows.start : rows.built[i - 1].to;
          const prevY = y - ROW_H / 2;
          const curY = y + ROW_H / 2;
          return (
            <motion.g
              key={`${row.feature}-${i}`}
              initial={reduce ? false : { opacity: 0, transform: "translateY(4px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ duration: 0.28, delay: reduce ? 0 : i * 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* connector from previous running total */}
              <line
                x1={xFor(prevEnd)}
                y1={prevY}
                x2={xFor(prevEnd)}
                y2={curY}
                stroke="var(--line-2)"
                strokeWidth={1}
              />
              {/* floating bar */}
              <rect
                x={x0}
                y={y + ROW_H / 2 - 6}
                width={Math.max(x1 - x0, 2)}
                height={12}
                rx={2}
                fill={color}
                opacity={0.8}
              />
              {/* connector to next running total */}
              <line
                x1={xFor(row.to)}
                y1={curY}
                x2={xFor(row.to)}
                y2={y + ROW_H}
                stroke="var(--line-2)"
                strokeWidth={1}
              />
              <text
                x={0}
                y={y + ROW_H / 2 - 1}
                fontSize={12}
                fill="var(--text-1)"
              >
                {row.feature === "otherFactors" ? "Other factors" : row.value}
              </text>
              <text x={0} y={y + ROW_H / 2 + 12} fontSize={10} fill="var(--text-3)">
                {row.feature === "otherFactors" ? row.value : row.feature}
              </text>
              <text
                x={760}
                y={y + ROW_H / 2 + 4}
                fontSize={11}
                fill={positive ? "var(--ruby)" : "var(--sapphire)"}
                textAnchor="end"
                fontFamily="var(--font-geist-mono)"
              >
                {signed(row.contribution)} {positive ? "▲" : "▼"}
              </text>
            </motion.g>
          );
        })}

        {/* final capsule */}
        <motion.g
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : rows.built.length * 0.24 }}
        >
          <line
            x1={xFor(rows.final)}
            y1={PAD + rows.built.length * ROW_H}
            x2={xFor(rows.final)}
            y2={height - PAD - 2}
            stroke="var(--gold-500)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <rect
            x={LABEL_W - 8}
            y={height - PAD - 26}
            width={760 - LABEL_W - RIGHT_W + 16}
            height={26}
            rx={13}
            fill="transparent"
            stroke="var(--gold-600)"
            strokeWidth={1.25}
          />
          <text
            x={LABEL_W}
            y={height - PAD - 9}
            fontSize={11.5}
            fill="var(--gold-400)"
            fontFamily="var(--font-geist-mono)"
          >
            estimated probability {fmtP(finalProbability)}
            {interval ? `  ·  90% conformal ${fmtCi(interval)}` : ""}
          </text>
        </motion.g>
      </svg>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-[2px] bg-ruby" /> toward risk
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-[2px] bg-sapphire" /> away from risk
        </span>
      </p>
      <p className={cn("mt-1 text-xs italic text-ink-3")}>
        Associations learned by the model — not causes.
      </p>
    </div>
  );
}
