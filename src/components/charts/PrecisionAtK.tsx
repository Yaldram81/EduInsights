"use client";

/**
 * PrecisionAtK — precision and recall when acting on the top-k highest
 * scored students (k = 5..30), computed client-side from OOF vectors.
 * A slider pins k; a champagne dot marks the operating point.
 */

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { precisionRecallAtK } from "@/lib/client/analyze";
import { AXIS_TICK, ChartTooltip, COLORS, GRID_STROKE } from "@/components/charts/chartTheme";
import { fmtPct } from "@/lib/format";

export function PrecisionAtK({
  y,
  pred,
  n,
}: {
  y: number[];
  pred: number[];
  n: number;
}) {
  const curve = useMemo(() => precisionRecallAtK(y, pred), [y, pred]);
  const [k, setK] = useState(10);

  const point = curve.find((p) => p.k === k) ?? curve[curve.length - 1];
  const flagged = Math.round((n * point.k) / 100);

  return (
    <div>
      <div className="h-[300px] w-full" role="img" aria-label="Precision and recall for the top k students">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="k"
              type="number"
              domain={[5, 30]}
              ticks={[5, 10, 15, 20, 25, 30]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
            />
            <YAxis
              domain={[0, 1]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            />
            <Tooltip
              cursor={{ stroke: GRID_STROKE }}
              content={<ChartTooltip fmt={(v: number) => fmtPct(v)} />}
            />
            <Line
              type="monotone"
              dataKey="precision"
              name="Precision @k"
              stroke={COLORS.champagne}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="recall"
              name="Recall @k"
              stroke={COLORS.sapphire}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={point.k}
              y={point.precision}
              r={5}
              fill={COLORS.champagne}
              stroke="var(--bg-2)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex min-w-[220px] flex-1 items-center gap-3">
          <span className="num shrink-0 text-xs text-ink-3">k = {point.k}</span>
          <Slider
            value={[point.k]}
            min={5}
            max={30}
            step={1}
            onValueChange={(vals: number[]) => setK(vals[0] ?? 10)}
            aria-label="Number of students to review (k)"
          />
        </div>
        <p className="num text-xs text-ink-2">
          <span className="text-gold-400">{fmtPct(point.precision)}</span> precision ·{" "}
          <span className="text-sapphire">{fmtPct(point.recall)}</span> recall · ≈{" "}
          {flagged} students flagged
        </p>
      </div>
    </div>
  );
}
