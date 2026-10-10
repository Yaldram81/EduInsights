"use client";

/**
 * EduInsight AI — chart theme. One champagne-forward palette, model colors,
 * baseline styling, shared axis/tooltip/card shells. No chart hardcodes
 * result numbers — everything arrives via props from the API.
 */

import type { ReactNode } from "react";
import { ApertureLine } from "@/components/brand/ApertureLine";
import { SectionHeading } from "@/components/data/SectionHeading";
import { cn } from "@/lib/utils";

export const COLORS = {
  champagne: "#D4AF6A",
  sapphire: "#6C8BEA",
  emerald: "#4FB58A",
  amethyst: "#C07FD6",
  copper: "#E58F6B",
  aquamarine: "#5CC0C9",
  ruby: "#D9576B",
  platinum: "#9BA3B5",
} as const;

export const MODEL_COLOR: Record<string, string> = {
  logistic: COLORS.champagne,
  ridge: COLORS.champagne,
  tree: COLORS.sapphire,
  forest: COLORS.emerald,
  majority: COLORS.platinum,
  mean: COLORS.platinum,
  rule: COLORS.platinum,
  g2rule: COLORS.copper,
  g1rule: COLORS.copper,
};

export const BASELINE_MODELS = new Set(["majority", "mean", "rule", "g1rule", "g2rule"]);

export const MODEL_LABELS: Record<string, string> = {
  logistic: "Logistic (L2)",
  ridge: "Ridge",
  tree: "Decision tree",
  forest: "Random forest",
  majority: "Majority class",
  mean: "Mean G3",
  rule: "Rule (failures/absences)",
  g1rule: "G3 = G1 rule",
  g2rule: "G3 = G2 rule",
};

export const modelLabel = (m: string): string => MODEL_LABELS[m] ?? m;

export const METRIC_LABELS: Record<string, string> = {
  prAuc: "PR-AUC",
  rocAuc: "ROC-AUC",
  balAcc: "Balanced accuracy",
  mcc: "MCC",
  precAt10: "Precision @10",
  recallAt10: "Recall @10",
  brier: "Brier",
  ece: "ECE",
  mae: "MAE",
  rmse: "RMSE",
  r2: "R²",
  spearman: "Spearman ρ",
};

export const metricLabel = (m: string): string => METRIC_LABELS[m] ?? m;

/** Axis ticks: quiet mono, 11 px. */
export const AXIS_TICK = {
  fill: "#827E74",
  fontSize: 11,
  fontFamily: "var(--font-geist-mono)",
} as const;

export const GRID_STROKE = "rgba(243,239,230,0.05)";

/* --------------------------------------------------------------- tooltip */

export interface TipEntry {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  strokeDasharray?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  suffix,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  fmt?: (v: number) => string;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const format = fmt ?? ((v: number) => v.toFixed(2));
  return (
    <div className="glass rounded-md px-3 py-2 shadow-e2">
      {label != null && label !== "" ? (
        <p className="num mb-1 text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {String(label)}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {payload.map((entry, i) => {
          const v = Array.isArray(entry.value) ? entry.value[0] : entry.value;
          const num = typeof v === "number" ? v : Number(v);
          return (
            <li key={i} className="flex items-center gap-2 text-xs text-ink-1">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: entry.color ?? "var(--gold-500)" }}
              />
              <span className="text-ink-2">{String(entry.name ?? entry.dataKey ?? "")}</span>
              <span className="num ml-auto">
                {Number.isFinite(num) ? format(num) : "—"}
                {suffix ?? ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ card shell */

/**
 * ChartCard — every chart and table lives in one of these:
 * bg-card, hairline border, 14 px radius, SectionHeading or a
 * finding-statement title, EvidenceFooter below.
 */
export function ChartCard({
  title,
  subtitle,
  overline,
  children,
  footer,
  footerItems,
  actions,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  overline?: string;
  children: ReactNode;
  footer?: ReactNode;
  footerItems?: (string | null | undefined)[];
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-hairline bg-card p-6",
        className,
      )}
    >
      <ApertureLine className="absolute inset-x-0 top-0" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading overline={overline} title={title} description={undefined} />
          {subtitle ? (
            <p className="max-w-[56ch] text-sm leading-relaxed text-ink-2">{subtitle}</p>
          ) : null}
          {actions}
        </div>
        <div className={cn("mt-5", bodyClassName)}>{children}</div>
        {footerItems && footerItems.length > 0 ? (
          <p className="num mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-ink-3">
            {footerItems
              .filter((x): x is string => Boolean(x))
              .map((part, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  {i > 0 ? (
                    <span aria-hidden className="text-ink-4">
                      ·
                    </span>
                  ) : null}
                  <span>{part}</span>
                </span>
              ))}
          </p>
        ) : (
          footer
        )}
      </div>
    </section>
  );
}
