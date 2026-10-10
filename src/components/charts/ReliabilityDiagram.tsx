"use client";

/**
 * ReliabilityDiagram — calibration of OOF probabilities: observed fraction
 * positive vs mean predicted probability per bin, diagonal reference,
 * count histogram on a secondary axis, ECE chip.
 */

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, ChartTooltip, COLORS, GRID_STROKE } from "@/components/charts/chartTheme";
import type { ReliabilityBin } from "@/lib/client/analyze";
import { fmtP } from "@/lib/format";

export function ReliabilityDiagram({
  bins,
  ece,
}: {
  bins: ReliabilityBin[];
  ece: number | null;
}) {
  const data = bins.map((b, i) => ({
    meanPred: (i + 0.5) / bins.length,
    fracPos: b.count > 0 ? b.fracPos : null,
    count: b.count,
  }));

  return (
    <div className="relative">
      {ece != null ? (
        <span className="num absolute right-2 top-0 z-10 rounded-xs border border-gold-700 px-2 py-0.5 text-[11px] text-gold-400">
          ECE {fmtP(ece)}
        </span>
      ) : null}
      <div className="h-[300px] w-full" role="img" aria-label={`Reliability diagram, ECE ${fmtP(ece)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="meanPred"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => fmtP(v, 2)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
            />
            <YAxis
              yAxisId="frac"
              domain={[0, 1]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => fmtP(v, 1)}
            />
            <YAxis yAxisId="count" hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ stroke: GRID_STROKE }}
              content={
                <ChartTooltip
                  fmt={(v: number) => fmtP(v, 2)}
                />
              }
            />
            <Bar
              yAxisId="count"
              dataKey="count"
              name="students per bin"
              fill="var(--bg-4)"
              isAnimationActive={false}
            />
            <ReferenceLine
              yAxisId="frac"
              segment={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              stroke={COLORS.platinum}
              strokeDasharray="4 4"
            />
            <Line
              yAxisId="frac"
              type="monotone"
              dataKey="fracPos"
              name="observed share at risk"
              stroke={COLORS.champagne}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.champagne, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Diagonal = perfect calibration. Points below the line → the model over-estimates
        risk in that bin; above → under-estimates.
      </p>
    </div>
  );
}
