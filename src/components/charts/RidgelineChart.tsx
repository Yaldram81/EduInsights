"use client";

/**
 * RidgelineChart — G1/G2/G3 grade densities, stacked (G1 top → G3 bottom),
 * champagne gradient fills, direct labels, mono x ticks at 0/5/10/15/20.
 * Pure SVG — densities arrive from /api/overview ridgeline.
 */

import type { RidgeSeries } from "@/lib/client/api";

const W = 720;
const ROW_H = 62;
const PAD_L = 148;
const PAD_R = 24;
const PAD_T = 30;
const AMP = 46;

const LABELS: Record<string, string> = {
  G1: "G1 — first period",
  G2: "G2 — second period",
  G3: "G3 — final grade",
};

const ORDER = ["G1", "G2", "G3"];

export function RidgelineChart({
  series,
}: {
  series: RidgeSeries[];
}) {
  const ordered = ORDER.map((g) => series.find((s) => s.grade === g)).filter(
    (s): s is RidgeSeries => Boolean(s && s.points.length > 1),
  );
  if (ordered.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-3">No distribution data.</p>;
  }

  const height = PAD_T + ordered.length * ROW_H + 26;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        role="img"
        aria-label="Grade distributions G1, G2 and G3 as stacked density curves"
      >
        <defs>
          <linearGradient id="ridge-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--gold-500)" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* x gridlines at 0/5/10/15/20 */}
        {[0, 5, 10, 15, 20].map((v) => {
          const x = PAD_L + (v / 20) * (W - PAD_L - PAD_R);
          return (
            <g key={v}>
              <line
                x1={x}
                y1={PAD_T - 12}
                x2={x}
                y2={height - 24}
                stroke="rgba(243,239,230,0.05)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - 8}
                fontSize={10}
                fill="var(--text-3)"
                textAnchor="middle"
                fontFamily="var(--font-geist-mono)"
              >
                {v}
              </text>
            </g>
          );
        })}

        {ordered.map((s, i) => {
          const baseY = PAD_T + i * ROW_H + ROW_H - 8;
          const maxDensity = Math.max(...s.points.map((p) => p.density)) || 1;
          const xFor = (grade: number) => PAD_L + (grade / 20) * (W - PAD_L - PAD_R);
          const path = s.points
            .map(
              (p, j) =>
                `${j === 0 ? "M" : "L"} ${xFor(p.x).toFixed(1)} ${(baseY - (p.density / maxDensity) * AMP).toFixed(1)}`,
            )
            .join(" ")
            .concat(` L ${xFor(s.points[s.points.length - 1].x).toFixed(1)} ${baseY} L ${xFor(s.points[0].x).toFixed(1)} ${baseY} Z`);
          return (
            <g key={s.grade}>
              <text x={0} y={baseY - AMP + 4} fontSize={12} fill="var(--text-1)">
                {LABELS[s.grade] ?? s.grade}
              </text>
              <path d={path} fill="url(#ridge-fill)" stroke="var(--gold-500)" strokeWidth={1.25} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
