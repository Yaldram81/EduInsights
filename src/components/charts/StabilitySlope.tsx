"use client";

/**
 * StabilitySlope — top-8 feature rankings across the 5 logistic bootstrap
 * refits (seeds 100–104). Each feature is a polyline from its rank in the
 * first seed to its rank in the last; color by seed-0 rank. Jaccard badge
 * quantifies how much the top-8 set itself moves.
 */

import type { StabilityModel } from "@/lib/client/api";
import { fmtP } from "@/lib/format";
import { COLORS } from "@/components/charts/chartTheme";

const W = 720;
const H = 240;
const PAD_L = 128;
const PAD_R = 128;
const TOP = 20;
const ROW = 24;

export function StabilitySlope({
  logistic,
}: {
  logistic: StabilityModel;
}) {
  const seeds = logistic.seeds;
  if (seeds.length < 2) {
    return <p className="py-8 text-center text-sm text-ink-3">Not enough refits to display.</p>;
  }

  const first = seeds[0].top.slice(0, 8);
  const last = seeds[seeds.length - 1].top.slice(0, 8);
  const firstRank = new Map(first.map((f, i) => [f.feature, i]));
  const lastRank = new Map(last.map((f, i) => [f.feature, i]));
  const features = first.map((f) => f.feature);

  const xFor = (seedIdx: number) =>
    PAD_L + (seedIdx / (seeds.length - 1)) * (W - PAD_L - PAD_R);
  const yFor = (rank: number) => TOP + rank * ROW + ROW / 2;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="num rounded-xs border border-gold-700 px-2 py-0.5 text-[11px] text-gold-400">
          mean Jaccard {fmtP(logistic.meanJaccard)}
        </span>
        <span className="num text-[11px] text-ink-3">
          Kendall τ {fmtP(logistic.kendall)} · 5 bootstrap refits
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Top-8 feature rankings across five bootstrap refits"
      >
        {/* rank axis numbers */}
        {Array.from({ length: 8 }).map((_, r) => (
          <text
            key={r}
            x={PAD_L - 12}
            y={yFor(r) + 3.5}
            fontSize={10}
            fill="var(--text-4)"
            textAnchor="end"
            fontFamily="var(--font-geist-mono)"
          >
            {r + 1}
          </text>
        ))}

        {features.map((feature, i) => {
          const color = COLORS[["champagne", "sapphire", "emerald", "amethyst", "copper", "aquamarine", "ruby", "platinum"][i] as keyof typeof COLORS];
          const points = seeds
            .map((seed, sIdx) => {
              const rank = seed.top.findIndex((t) => t.feature === feature);
              return rank >= 0 && rank < 8 ? `${xFor(sIdx)},${yFor(rank)}` : null;
            })
            .filter((p): p is string => p !== null)
            .join(" ");
          const lastR = lastRank.get(feature);
          const firstR = firstRank.get(feature);
          return (
            <g key={feature}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={1.75}
                strokeLinejoin="round"
                opacity={0.9}
              />
              <text
                x={PAD_L - 20}
                y={yFor(firstR ?? i) + 3.5}
                fontSize={11}
                fill="var(--text-2)"
                textAnchor="end"
              >
                {feature}
              </text>
              {lastR != null ? (
                <text x={W - PAD_R + 20} y={yFor(lastR) + 3.5} fontSize={11} fill="var(--text-2)">
                  {feature}
                </text>
              ) : null}
            </g>
          );
        })}

        <text
          x={PAD_L}
          y={H - 6}
          fontSize={10}
          fill="var(--text-4)"
          fontFamily="var(--font-geist-mono)"
        >
          seed {seeds[0].seed}
        </text>
        <text
          x={W - PAD_R}
          y={H - 6}
          fontSize={10}
          fill="var(--text-4)"
          textAnchor="end"
          fontFamily="var(--font-geist-mono)"
        >
          seed {seeds[seeds.length - 1].seed}
        </text>
      </svg>
      <p className="mt-1 text-xs text-ink-3">
        Top-8 feature rankings across 5 bootstrap refits (logistic, |β|). Left labels follow
        the first refit; right labels the last. Rank 1 = strongest coefficient.
      </p>
    </div>
  );
}
