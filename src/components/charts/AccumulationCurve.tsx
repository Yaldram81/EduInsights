"use client";

/**
 * AccumulationCurve — the study's core figure. Primary metric mean per
 * information tier (S0→S4) for every model; CI band for the primary model;
 * champagne solid for logistic/ridge, platinum dashed for baselines.
 * X is ordinal; the tick formatter reveals what each tier adds.
 */

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RunRow, Task } from "@/lib/client/api";
import { fmtP } from "@/lib/format";
import {
  AXIS_TICK,
  BASELINE_MODELS,
  ChartTooltip,
  COLORS,
  GRID_STROKE,
  METRIC_LABELS,
  MODEL_COLOR,
  modelLabel,
} from "@/components/charts/chartTheme";

export const TIER_TICK: Record<string, string> = {
  S0: "S0 · Background",
  S1: "S1 · +History",
  S2: "S2 · +Behavior",
  S3: "S3 · +G1",
  S4: "S4 · +G2",
};

interface TierRow {
  tier: string;
  [model: string]: string | number | [number, number] | undefined;
}

export function AccumulationCurve({
  runs,
  task,
  infoSetOrder = ["S0", "S1", "S2", "S3", "S4"],
}: {
  runs: RunRow[];
  task: Task;
  infoSetOrder?: string[];
}) {
  const { data, models, metric, primary } = useMemo(() => {
    const metricName =
      runs.find((r) => r.primaryMetric)?.primaryMetric ??
      (task === "classification" ? "prAuc" : "mae");
    const modelSet: string[] = [];
    for (const r of runs) if (!modelSet.includes(r.model)) modelSet.push(r.model);
    const primaryModel =
      task === "classification"
        ? modelSet.includes("logistic")
          ? "logistic"
          : modelSet[0]
        : modelSet.includes("ridge")
          ? "ridge"
          : modelSet[0];

    const rows: TierRow[] = infoSetOrder.map((tier) => {
      const row: TierRow = { tier };
      for (const m of modelSet) {
        const run = runs.find((r) => r.infoSet === tier && r.model === m);
        const stat = run?.metrics[metricName] ?? null;
        row[m] = stat ? stat.mean : undefined;
        if (m === primaryModel && stat) {
          row[`${primaryModel}Band`] = [stat.ci[0], stat.ci[1]] as [number, number];
        }
      }
      return row;
    });
    return { data: rows, models: modelSet, metric: metricName, primary: primaryModel };
  }, [runs, task, infoSetOrder]);

  // Y domain over every mean + the CI band of the primary model, padded.
  const domain = useMemo(() => {
    const values: number[] = [];
    for (const row of data) {
      for (const m of models) {
        const v = row[m];
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
      const band = row[`${primary}Band`];
      if (Array.isArray(band)) values.push(band[0], band[1]);
    }
    if (values.length === 0) return ["auto", "auto"] as [string, string];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.12, 0.02);
    return [lo - pad, hi + pad] as [number, number];
  }, [data, models, primary]);

  const isLoss = metric === "mae" || metric === "rmse";
  const fmt = (v: number) => fmtP(v, 2);

  if (models.length === 0) {
    return (
      <div className="flex h-[440px] items-center justify-center text-sm text-ink-3">
        No runs for this subject and task.
      </div>
    );
  }

  return (
    <div className="h-[440px] w-full" role="img" aria-label={`${METRIC_LABELS[metric] ?? metric} by information tier for every model`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="tier"
            type="category"
            ticks={infoSetOrder}
            tickFormatter={(v: string) => TIER_TICK[v] ?? v}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            interval={0}
          />
          <YAxis
            domain={domain}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => fmt(v)}
            label={{
              value: METRIC_LABELS[metric] ?? metric,
              angle: -90,
              position: "insideLeft",
              style: { fill: "#827E74", fontSize: 11, fontFamily: "var(--font-geist-mono)" },
            }}
          />
          <Tooltip
            cursor={{ stroke: GRID_STROKE }}
            content={<ChartTooltip fmt={fmt} />}
          />
          {primary ? (
            <Area
              type="monotone"
              dataKey={`${primary}Band`}
              stroke="none"
              fill={COLORS.champagne}
              fillOpacity={0.12}
              connectNulls
              isAnimationActive={false}
              legendType="none"
            />
          ) : null}
          {models.map((m) => {
            const baseline = BASELINE_MODELS.has(m);
            const color = MODEL_COLOR[m] ?? COLORS.platinum;
            const isPrimary = m === primary;
            return (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                name={modelLabel(m)}
                stroke={color}
                strokeWidth={isPrimary ? 2.5 : 1.75}
                strokeDasharray={baseline ? "5 4" : undefined}
                strokeOpacity={baseline ? 0.75 : 1}
                dot={{ r: 2, strokeWidth: 0, fill: color, fillOpacity: 0.9 }}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
