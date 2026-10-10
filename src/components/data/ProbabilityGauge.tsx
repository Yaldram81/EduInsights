"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fmtCi, fmtP } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZE = 260;
const CX = 130;
const CY = 130;
const R = 92;
const START = -120; // degrees from 12 o'clock, clockwise
const SWEEP = 240; // 240° arc, gap at the bottom

function pt(deg: number, radius: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + radius * Math.sin(rad), CY - radius * Math.cos(rad)];
}

function arc(a0: number, a1: number, radius: number): string {
  const [x0, y0] = pt(a0, radius);
  const [x1, y1] = pt(a1, radius);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const angleFor = (p: number) => START + SWEEP * Math.min(1, Math.max(0, p));

/**
 * ProbabilityGauge — 240° arc gauge: track (bg-4), champagne value arc,
 * translucent gold conformal-interval band, platinum tick at the decision
 * threshold, center numeral + captions. role="img" with a full sentence.
 */
export function ProbabilityGauge({
  probability,
  interval,
  threshold = 0.5,
  confidence = 90,
  className,
}: {
  probability: number;
  interval?: readonly [number, number] | null;
  threshold?: number;
  confidence?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const p = Math.min(1, Math.max(0, probability));
  const valueAngle = angleFor(p);
  const [nx, ny] = pt(valueAngle, R - 16);
  const [x0, y0] = pt(START + 14, R + 18);
  const [x1, y1] = pt(START + SWEEP - 14, R + 18);
  const [tx, ty0] = pt(angleFor(threshold), R + 8);
  const [, ty1] = pt(angleFor(threshold), R - 8);
  const description = `Estimated probability ${fmtP(p)}${
    interval ? `, ${confidence}% conformal interval ${fmtCi(interval)}` : ""
  }. Decision threshold ${fmtP(threshold)} marked.`;

  return (
    <figure className={cn("relative mx-auto w-full max-w-[300px]", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label={description}
      >
        {/* track */}
        <path
          d={arc(START, START + SWEEP, R)}
          stroke="var(--bg-4)"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
        />
        {/* conformal interval band */}
        {interval ? (
          <path
            d={arc(angleFor(interval[0]), angleFor(interval[1]), R)}
            stroke="var(--gold-500)"
            strokeOpacity={0.16}
            strokeWidth={16}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {/* value arc */}
        <motion.path
          d={arc(START, valueAngle, R)}
          stroke="var(--gold-500)"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          initial={reduce ? false : { pathLength: 0 }}
          animate={reduce ? undefined : { pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* needle */}
        <line
          x1={CX}
          y1={CY}
          x2={nx}
          y2={ny}
          stroke="var(--gold-300)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={3} fill="var(--gold-400)" />
        {/* decision threshold tick */}
        <line
          x1={tx}
          y1={ty0}
          x2={tx}
          y2={ty1}
          stroke="var(--text-4)"
          strokeWidth={1.5}
        />
        <text
          x={CX + 12}
          y={CY - R - 6}
          fontSize={10}
          fill="var(--text-3)"
          fontFamily="var(--font-geist-mono)"
        >
          {fmtP(threshold)} · threshold
        </text>
        {/* end labels */}
        <text
          x={x0}
          y={y0}
          fontSize={10}
          fill="var(--text-4)"
          textAnchor="middle"
          fontFamily="var(--font-geist-mono)"
        >
          0
        </text>
        <text
          x={x1}
          y={y1}
          fontSize={10}
          fill="var(--text-4)"
          textAnchor="middle"
          fontFamily="var(--font-geist-mono)"
        >
          1
        </text>
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="num font-display text-4xl leading-none text-ink-1">
          {fmtP(p)}
        </span>
        <span className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-3">
          estimated probability
        </span>
        {interval ? (
          <span className="num mt-1 text-xs text-ink-2">
            {confidence}% conformal interval {fmtCi(interval)}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
