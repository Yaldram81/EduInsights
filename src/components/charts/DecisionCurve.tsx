"use client";

/**
 * DecisionCurve — net benefit of acting on the model vs treating everyone,
 * across decision thresholds. nb = TP/n − FP/n · t/(1−t).
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DecisionPoint } from "@/lib/client/analyze";
import { AXIS_TICK, ChartTooltip, COLORS, GRID_STROKE } from "@/components/charts/chartTheme";
import { fmtP } from "@/lib/format";

export function DecisionCurve({
  points,
  fmt = (v: number) => fmtP(v, 3),
}: {
  points: DecisionPoint[];
  fmt?: (v: number) => string;
}) {
  return (
    <div>
      <div className="h-[300px] w-full" role="img" aria-label="Net benefit across thresholds">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="threshold"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              tickFormatter={(v: number) => fmtP(v, 2)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => fmt(v)}
            />
            <Tooltip cursor={{ stroke: GRID_STROKE }} content={<ChartTooltip fmt={fmt} />} />
            <ReferenceLine y={0} stroke={COLORS.platinum} strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="nbModel"
              name="Act on the model"
              stroke={COLORS.champagne}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="nbAll"
              name="Treat everyone"
              stroke={COLORS.sapphire}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Net benefit = TP/n − FP/n · t/(1−t) — the model is only worth following where its
        curve sits above both the platinum zero line and the treat-everyone curve.
      </p>
    </div>
  );
}
