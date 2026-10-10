"use client";

/**
 * LandingView — the observatory entrance: aperture hero, four honest KPIs,
 * the accumulation curve (the study's core question) and paths into the
 * four views. Every number arrives from the API.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3, BookOpen, Crosshair, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApertureLine } from "@/components/brand/ApertureLine";
import { AccumulationCurve } from "@/components/charts/AccumulationCurve";
import { ChartCard } from "@/components/charts/chartTheme";
import { EvidenceFooter } from "@/components/data/EvidenceFooter";
import { KpiCard } from "@/components/data/KpiCard";
import { SectionHeading } from "@/components/data/SectionHeading";
import { ChartSkeleton, ErrorState, KpiSkeletonRow } from "@/components/data/States";
import { useExperiments, useHealth, useOverview } from "@/lib/client/api";
import { fmtInt, fmtP } from "@/lib/format";

const EASE = [0.22, 1, 0.36, 1] as const;

const MINI = [
  {
    href: "#/overview",
    icon: BarChart3,
    title: "Overview",
    text: "Distributions, subgroup risk and the association ladder for both subjects.",
  },
  {
    href: "#/experiments",
    icon: FlaskConical,
    title: "Experiments",
    text: "5×3 grouped stratified CV across five information tiers, with baselines.",
  },
  {
    href: "#/predict",
    icon: Crosshair,
    title: "Predict",
    text: "A calibrated estimate with a 90% conformal interval and a full explanation.",
  },
  {
    href: "#/about",
    icon: BookOpen,
    title: "About",
    text: "Protocol, metrics, fairness caveats, limitations and citation.",
  },
] as const;

export function LandingView() {
  const reduce = useReducedMotion();
  const overview = useOverview("math");
  const health = useHealth();
  const experiments = useExperiments("math", "classification");

  const kpis = overview.data?.kpis;
  const passMark = overview.data?.evidence.passMark ?? 10;
  const mathMeta = health.data?.datasets.find((d) => d.subject === "math");
  const version = mathMeta?.version;

  const logisticRuns = experiments.data?.runs.filter((r) => r.model === "logistic") ?? [];
  const s0 = logisticRuns.find((r) => r.infoSet === "S0")?.metrics.prAuc?.mean ?? null;
  const s4 = logisticRuns.find((r) => r.infoSet === "S4")?.metrics.prAuc?.mean ?? null;

  const rise = (from: number | null, to: number | null, d = 2) =>
    `Adding grades lifts PR-AUC from ${fmtP(from, d)} to ${fmtP(to, d)}`;

  return (
    <div className="flex flex-col gap-10">
      {/* ------------------------------------------------------------- hero */}
      <section className="canvas-atmosphere relative overflow-hidden rounded-[14px] border border-hairline bg-section px-6 py-14 md:px-12 md:py-20">
        <ApertureLine className="absolute inset-x-0 top-0" />
        <div className="relative mx-auto max-w-[820px]">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400"
          >
            Explainable learning analytics
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
            className="mt-4 font-display text-[clamp(2.75rem,6vw,4.75rem)] font-medium leading-[1.03] tracking-tight text-ink-1"
          >
            Evidence, <span className="italic text-gold-400">not</span> verdicts.
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: EASE }}
            className="mt-6 max-w-[62ch] text-base leading-relaxed text-ink-2"
          >
            A rigorous, reproducible study of early student-risk prediction on Portuguese
            secondary-school data — calibrated, explainable and honest about uncertainty.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" className="grad-gold border-0 font-medium text-[#1A1405] hover:opacity-90">
              <a href="#/experiments">
                Explore experiments
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-gold-600 bg-transparent text-gold-400 hover:bg-gold-500/10 hover:text-gold-300"
            >
              <a href="#/predict">Try the predictor</a>
            </Button>
          </motion.div>
        </div>
        <ApertureLine className="absolute inset-x-0 bottom-0" />
      </section>

      {/* ------------------------------------------------------------- KPIs */}
      <section aria-label="Key figures">
        {overview.isLoading ? (
          <KpiSkeletonRow count={4} />
        ) : overview.isError ? (
          <ErrorState message="Could not load the headline figures." onRetry={() => overview.refetch()} />
        ) : kpis ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Students analysed"
              value={kpis.n}
              decimals={0}
              footer={<EvidenceFooter dataset="UCI Student Performance · mathematics" extra={version ? `v${version}` : undefined} />}
            />
            <KpiCard
              label="At-risk share"
              value={kpis.atRiskShare * 100}
              decimals={1}
              footer={<EvidenceFooter dataset="UCI Student Performance · mathematics" extra={`G3 < ${passMark} pass mark`} />}
            />
            <KpiCard
              label="Mean final grade"
              value={kpis.meanG3}
              decimals={2}
              footer={<EvidenceFooter dataset="UCI Student Performance · mathematics" extra="scale 0–20" />}
            />
            <KpiCard
              label="Missing final grades"
              value={kpis.zeroG3Share * 100}
              decimals={1}
              footer={<EvidenceFooter dataset="UCI Student Performance · mathematics" extra="G3 = 0 — analysed separately" />}
            />
          </div>
        ) : null}
      </section>

      {/* ------------------------------------------------- accumulation card */}
      <section className="flex flex-col gap-5">
        <SectionHeading
          overline="The core question"
          title="How information accumulates"
          description="Five information tiers — from background demographics (S0) to full period grades (S4). The accumulation curve below is the study's central instrument: how much does predictive power actually grow as information arrives, and where are the honest gains?"
        />
        {experiments.isLoading ? (
          <ChartSkeleton height={440} label="Loading the accumulation curve" />
        ) : experiments.isError ? (
          <ErrorState
            message="Could not load the experiment matrix. It may still be computing."
            onRetry={() => experiments.refetch()}
          />
        ) : experiments.data ? (
          <ChartCard
            title={s0 != null && s4 != null ? rise(s0, s4) : "The accumulation curve"}
            subtitle="Mathematics · classification · logistic regression with baselines. Band = 95% CI of the primary model."
            footerItems={[
              "5×3 grouped stratified CV",
              "seed 42",
              "PR-AUC · higher is better",
              `n = ${fmtInt(kpis?.n ?? 0)} students`,
            ]}
          >
            <AccumulationCurve runs={experiments.data.runs} task="classification" />
          </ChartCard>
        ) : null}
      </section>

      {/* ------------------------------------------------------- mini links */}
      <section aria-label="Where to go next">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MINI.map((l) => {
            const Icon = l.icon;
            return (
              <a
                key={l.href}
                href={l.href}
                className="group rounded-md border border-hairline bg-card p-5 transition-colors duration-200 ease-silk hover:border-gold-700"
              >
                <Icon className="size-5 text-gold-400" aria-hidden />
                <p className="mt-3 font-display text-lg text-ink-1">{l.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{l.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-gold-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Open <ArrowRight className="size-3" aria-hidden />
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
