"use client";

/**
 * OverviewView — dataset overview: subject toggle, honest KPIs, ridgeline
 * grade distributions, risk by subgroup, the association ladder and the
 * G3 = 0 cluster note. All numbers from /api/overview.
 */

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartCard } from "@/components/charts/chartTheme";
import { RidgelineChart } from "@/components/charts/RidgelineChart";
import { DatasetChip } from "@/components/data/Chips";
import { EvidenceFooter } from "@/components/data/EvidenceFooter";
import { KpiCard } from "@/components/data/KpiCard";
import { SectionHeading } from "@/components/data/SectionHeading";
import { ChartSkeleton, ErrorState, KpiSkeletonRow } from "@/components/data/States";
import { useMeta, useOverview, type Association, type OverviewSubject } from "@/lib/client/api";
import { fmtCi, fmtInt, fmtP, fmtPValue } from "@/lib/format";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { value: "math", label: "Mathematics" },
  { value: "por", label: "Portuguese" },
  { value: "both", label: "Both" },
] as const;

const AGE_BAND: Record<string, string> = { ageBand: "Age band" };

function AssociationLollipop({ rows }: { rows: Association[] }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    [rows],
  );
  const maxAbs = Math.max(...sorted.map((r) => Math.abs(r.value)), 0.01);
  const rowH = 22;
  const height = sorted.length * rowH + 8;
  const xFor = (v: number) => 150 + (Math.abs(v) / maxAbs) * (700 - 150 - 10);

  return (
    <svg
      viewBox={`0 0 700 ${height}`}
      className="w-full"
      role="img"
      aria-label="Feature associations with failing the final grade, strongest first"
    >
      {sorted.map((r, i) => {
        const y = i * rowH + rowH / 2 + 4;
        const x = xFor(r.value);
        const sig = r.q < 0.05;
        const fill = sig ? "var(--gold-500)" : "none";
        const stroke = "var(--gold-500)";
        const label =
          r.type === "categorical"
            ? `Cramér's V ${r.value.toFixed(3)}`
            : `Cliff's δ ${r.value.toFixed(3)}`;
        return (
          <g key={r.feature}>
            <title>
              {`${label} · ${fmtPValue(r.p)} · q = ${r.q.toFixed(3)}${sig ? " · significant after BH-FDR" : ""}`}
            </title>
            <text x={0} y={y + 3.5} fontSize={11} fill={sig ? "var(--text-1)" : "var(--text-3)"}>
              {r.feature}
            </text>
            <line x1={150} y1={y} x2={x} y2={y} stroke="rgba(243,239,230,0.12)" strokeWidth={1} />
            {r.type === "categorical" ? (
              <circle cx={x} cy={y} r={4.5} fill={fill} stroke={stroke} strokeWidth={1.5} />
            ) : (
              <rect
                x={x - 4}
                y={y - 4}
                width={8}
                height={8}
                transform={`rotate(45 ${x} ${y})`}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RiskBars({
  groups,
}: {
  groups: { feature: string; levels: { level: string; n: number; riskShare: number }[] }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.feature}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            {g.feature}
          </p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {g.levels.map((l) => (
              <div key={l.level} className="flex items-center gap-2.5">
                <span className="w-16 shrink-0 truncate text-xs text-ink-2">{l.level}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-xs bg-raised">
                  <div
                    className="h-full rounded-xs bg-gold-500/80"
                    style={{ width: `${Math.min(100, l.riskShare * 100)}%` }}
                  />
                </div>
                <span className="num w-28 shrink-0 text-right text-[11px] text-ink-3">
                  {(l.riskShare * 100).toFixed(1)}% · n = {fmtInt(l.n)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverviewView() {
  const [subject, setSubject] = useState<OverviewSubject>("math");
  const overview = useOverview(subject);
  const meta = useMeta();
  const data = overview.data;

  const labelFor = (name: string) =>
    meta.data?.featureMeta.find((f) => f.name === name)?.label ??
    AGE_BAND[name] ??
    name;

  const sortedAssociations = useMemo(
    () =>
      data
        ? [...data.associations].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        : [],
    [data],
  );

  return (
    <div className="flex flex-col gap-8">
      {/* --------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          overline="Dataset overview"
          title="The two cohorts, plainly described"
          description="Who is in the data, how the final grade distributes, where risk concentrates — and how strongly each background feature is associated with failing. Associations are never causes."
        />
        <div className="flex items-center gap-3">
          <Tabs
            value={subject}
            onValueChange={(v) => setSubject(v as OverviewSubject)}
          >
            <TabsList aria-label="Subject">
              {SUBJECTS.map((s) => (
                <TabsTrigger key={s.value} value={s.value}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DatasetChip subject={subject} />
        </div>
      </div>

      {overview.isLoading ? (
        <KpiSkeletonRow count={5} />
      ) : overview.isError ? (
        <ErrorState message="Could not load the dataset overview." onRetry={() => overview.refetch()} />
      ) : data ? (
        <>
          {/* ------------------------------------------------------- KPIs */}
          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
              data.subject === "both" && "xl:grid-cols-5",
            )}
          >
            <KpiCard
              label="Students analysed"
              value={data.kpis.n}
              decimals={0}
              footer={<EvidenceFooter dataset={data.evidence.dataset} />}
            />
            <KpiCard
              label="At-risk share"
              value={data.kpis.atRiskShare * 100}
              decimals={1}
              footer={<EvidenceFooter dataset={data.evidence.dataset} extra={`G3 < ${data.evidence.passMark} pass mark`} />}
            />
            <KpiCard
              label="Mean final grade"
              value={data.kpis.meanG3}
              decimals={2}
              footer={<EvidenceFooter dataset={data.evidence.dataset} extra="scale 0–20" />}
            />
            <KpiCard
              label="Missing final grades"
              value={data.kpis.zeroG3Share * 100}
              decimals={1}
              footer={<EvidenceFooter dataset={data.evidence.dataset} extra="G3 = 0 — analysed separately" />}
            />
            {data.subject === "both" ? (
              <KpiCard
                label="Matched pairs"
                value={data.kpis.matchedPairs ?? null}
                decimals={0}
                footer={<EvidenceFooter dataset={data.evidence.dataset} extra="students matched across subjects" />}
              />
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* -------------------------------------------- ridgeline card */}
            <ChartCard
              className="lg:col-span-7"
              title="Grade distributions"
              subtitle="The final grade piles up just above the pass mark — and in a separate cluster at zero, which the regression analysis treats separately."
              footerItems={[
                `n = ${fmtInt(data.kpis.n)}`,
                data.evidence.dataset,
                `pass mark ${data.evidence.passMark}`,
                "Gaussian KDE · Silverman bandwidth",
              ]}
            >
              <RidgelineChart series={data.ridgeline} />
            </ChartCard>

            {/* -------------------------------------- subgroup risk card */}
            <ChartCard
              className="lg:col-span-5"
              title="Share at risk by subgroup"
              subtitle="Descriptive differences only — these are observational splits, not model behaviour and not causes."
              footerItems={[
                `n = ${fmtInt(data.kpis.n)}`,
                data.evidence.dataset,
                `G3 < ${data.evidence.passMark}`,
              ]}
            >
              <RiskBars
                groups={data.riskBySubgroup.map((g) => ({
                  feature: labelFor(g.feature),
                  levels: g.levels,
                }))}
              />
            </ChartCard>

            {/* ------------------------------------- associations card */}
            <ChartCard
              className="lg:col-span-12"
              title="Associations with failing the final grade"
              subtitle="Effect size with permutation p and BH-FDR q. Filled marks survive q < 0.05; hollow ones do not. Weak-to-moderate effects are the honest finding here."
              footerItems={[
                `n = ${fmtInt(data.kpis.n)}`,
                data.evidence.dataset,
                "categorical → Cramér's V (circle) · numeric → Cliff's δ (diamond)",
                "BH-FDR across all tested features",
              ]}
            >
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="min-w-0">
                  <AssociationLollipop rows={data.associations} />
                </div>
                <div className="max-h-96 overflow-y-auto rounded-md border border-hairline">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-hairline hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
                          Feature
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
                          Type
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
                          Effect
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-[0.14em] text-ink-3">
                          Value
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-[0.14em] text-ink-3">
                          q
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAssociations.map((a) => (
                        <TableRow key={a.feature} className="border-hairline">
                          <TableCell className="text-ink-1">{labelFor(a.feature)}</TableCell>
                          <TableCell className="text-ink-3">{a.type}</TableCell>
                          <TableCell className="text-ink-3">
                            {a.effect === "cramersV" ? "Cramér's V" : "Cliff's δ"}
                          </TableCell>
                          <TableCell className="num text-right text-ink-1">
                            {a.value.toFixed(3)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "num text-right",
                              a.q < 0.05 ? "text-gold-400" : "text-ink-3",
                            )}
                          >
                            {a.q < 0.001 ? "< 0.001" : a.q.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ChartCard>

            {/* ----------------------------------- G3 = 0 cluster note */}
            <div className="rounded-[14px] border border-amber/40 bg-amber/5 p-6 lg:col-span-12">
              <p className="font-display text-lg text-ink-1">The G3 = 0 cluster</p>
              <p className="mt-2 max-w-[80ch] text-sm leading-relaxed text-ink-2">
                <span className="num">
                  {fmtInt(data.g3ZeroCluster.n)} students ({(data.g3ZeroCluster.shareOfAll * 100).toFixed(1)}%)
                </span>{" "}
                have a missing final grade recorded as zero, with a mean of{" "}
                <span className="num">{fmtP(data.g3ZeroCluster.meanAbsences, 1)}</span> absences and{" "}
                <span className="num">{(data.g3ZeroCluster.shareBelowPass * 100).toFixed(1)}%</span>{" "}
                already below the pass mark earlier in the year. Regression results are reported
                with and without these rows.
              </p>
              <EvidenceFooter
                className="mt-3"
                n={data.kpis.n}
                dataset={data.evidence.dataset}
                extra={`pass mark ${data.evidence.passMark}`}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
