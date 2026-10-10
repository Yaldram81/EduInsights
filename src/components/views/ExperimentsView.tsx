"use client";

/**
 * ExperimentsView — the research instrument. Task + subject controls, the
 * S0→S4 information ladder, a hero accumulation card, and a tab gallery:
 * model comparison · calibration · decision quality · explanations ·
 * fairness · ablation & transfer. Each card owns its loading / error
 * state independently.
 */

import { useMemo, useState } from "react";
import { Check, Minus, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccumulationCurve } from "@/components/charts/AccumulationCurve";
import { AblationTable } from "@/components/charts/AblationTable";
import { ChartCard } from "@/components/charts/chartTheme";
import { DecisionCurve } from "@/components/charts/DecisionCurve";
import { ForestPlot, type ForestRow } from "@/components/charts/ForestPlot";
import { PrecisionAtK } from "@/components/charts/PrecisionAtK";
import { ReliabilityDiagram } from "@/components/charts/ReliabilityDiagram";
import { StabilitySlope } from "@/components/charts/StabilitySlope";
import { SubgroupForest } from "@/components/charts/SubgroupForest";
import { BaselineChip, PreregisteredChip } from "@/components/data/Chips";
import { EvidenceFooter } from "@/components/data/EvidenceFooter";
import { InformationLadder } from "@/components/data/InformationLadder";
import { SectionHeading } from "@/components/data/SectionHeading";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/data/States";
import {
  useAblation,
  useExperiments,
  useHypotheses,
  useMeta,
  useOof,
  useStability,
  useSubgroups,
  useTransfer,
  type Hypothesis,
  type LadderSet,
  type RunRow,
  type Subject,
  type Task,
} from "@/lib/client/api";
import { binReliability, decisionCurve, precisionRecallAtK } from "@/lib/client/analyze";
import { fmtCi, fmtInt, fmtMetric, fmtP, fmtPValue, signed } from "@/lib/format";
import { metricLabel, modelLabel } from "@/components/charts/chartTheme";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "E1", label: "E1 · Accumulation" },
  { id: "E2", label: "E2 · Model comparison" },
  { id: "E3", label: "E3 · Calibration" },
  { id: "E4", label: "E4 · Decision quality" },
  { id: "E5", label: "E5 · Explanations" },
  { id: "E6", label: "E6 · Fairness" },
  { id: "E7", label: "E7 · Ablation & transfer" },
];

const STATUS_META = {
  supported: { icon: Check, cls: "border-emerald/40 bg-emerald/10 text-emerald", word: "supported" },
  not_supported: { icon: X, cls: "border-amber/40 bg-amber/10 text-amber", word: "not supported" },
  inconclusive: { icon: Minus, cls: "border-hairline-strong bg-transparent text-ink-2", word: "inconclusive" },
} as const;

function StatusChip({ status }: { status: Hypothesis["status"] }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[11px] font-medium", m.cls)}>
      <Icon className="size-3" aria-hidden />
      {m.word}
    </span>
  );
}

/* ------------------------------------------------------- protocol sheet */

function ProtocolSheet({ subject }: { subject: Subject }) {
  const hyp = useHypotheses(subject);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="border-gold-700 text-gold-400 hover:bg-gold-500/10">
          <ScrollText className="size-4" aria-hidden />
          Protocol
          <PreregisteredChip className="ml-1 border-0 px-0" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="font-display text-xl text-ink-1">Preregistered protocol</SheetTitle>
          <SheetDescription className="text-sm text-ink-2">
            Six hypotheses with decision rules fixed before the matrix was run.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-8">
          {hyp.isLoading ? (
            <p className="text-sm text-ink-3">Loading hypotheses…</p>
          ) : hyp.isError ? (
            <ErrorState message="Could not load the hypotheses." onRetry={() => hyp.refetch()} />
          ) : (
            hyp.data?.hypotheses.map((h) => (
              <article key={h.id} className="rounded-md border border-hairline bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="num text-xs font-semibold text-gold-400">{h.id}</span>
                  <StatusChip status={h.status} />
                </div>
                <p className="mt-2 font-display text-base text-ink-1">{h.title}</p>
                <p className="num mt-1.5 text-[11px] leading-relaxed text-ink-3">
                  Decision rule — {h.decisionRule}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{h.result}</p>
                {h.detail.length > 0 ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gold-400">Paired comparisons</summary>
                    <div className="mt-2 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className="text-[11px] text-ink-3">Comparison</TableHead>
                            <TableHead className="text-right text-[11px] text-ink-3">Δ</TableHead>
                            <TableHead className="text-right text-[11px] text-ink-3">95% CI</TableHead>
                            <TableHead className="text-right text-[11px] text-ink-3">p adj</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {h.detail.map((d, i) => (
                            <TableRow key={i} className="border-hairline">
                              <TableCell className="text-[11px] text-ink-2">{d.comparison}</TableCell>
                              <TableCell className="num text-right text-[11px] text-ink-1">
                                {signed(d.delta)}
                              </TableCell>
                              <TableCell className="num text-right text-[11px] text-ink-3">
                                {fmtCi(d.ci)}
                              </TableCell>
                              <TableCell className="num text-right text-[11px] text-ink-3">
                                {fmtPValue(d.pAdj)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </details>
                ) : null}
              </article>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------ tab bodies */

function ComparisonTab({
  runs,
  infoSet,
  task,
}: {
  runs: RunRow[];
  infoSet: LadderSet;
  task: Task;
}) {
  const rows = useMemo<ForestRow[]>(() => {
    const atTier = runs.filter((r) => r.infoSet === infoSet);
    const metric = runs[0]?.primaryMetric ?? "prAuc";
    const withMean = atTier
      .map((r) => ({ run: r, stat: r.metrics[metric] ?? null }))
      .filter((x): x is { run: RunRow; stat: NonNullable<typeof x.stat> } => x.stat != null);
    const higherBetter = task === "classification";
    const sorted = [...withMean].sort((a, b) =>
      higherBetter ? b.stat.mean - a.stat.mean : a.stat.mean - b.stat.mean,
    );
    const baselineMeans = sorted.filter((x) =>
      ["majority", "mean", "rule", "g1rule", "g2rule"].includes(x.run.model),
    );
    const reference =
      baselineMeans.length > 0
        ? higherBetter
          ? Math.max(...baselineMeans.map((b) => b.stat.mean))
          : Math.min(...baselineMeans.map((b) => b.stat.mean))
        : null;
    return sorted.map(({ run, stat }) => ({
      model: run.model,
      label: modelLabel(run.model),
      mean: stat.mean,
      ci: stat.ci,
      isBaseline: ["majority", "mean", "rule", "g1rule", "g2rule"].includes(run.model),
      significant:
        reference != null
          ? higherBetter
            ? stat.ci[0] > reference
            : stat.ci[1] < reference
          : false,
    }));
  }, [runs, infoSet, task]);

  const metric = runs[0]?.primaryMetric ?? "prAuc";

  return (
    <ChartCard
      title={`Model comparison at ${infoSet}`}
      subtitle={`${rows.length} models · ${metricLabel(metric)} · ${task === "classification" ? "higher" : "lower"} is better · 95% CIs from repeated CV. A champagne ● marks models whose CI excludes the best baseline.`}
      footerItems={[
        "5×3 grouped stratified CV",
        "seed 42",
        "identical folds across models",
        metricLabel(metric),
      ]}
    >
      <ForestPlot rows={rows} />
      <p className="mt-4 text-xs text-ink-3">
        Baselines are honest floors: <BaselineChip /> models are dashed/hollow. Beating a
        naive floor is the minimum bar for a model to be worth explaining.
      </p>
    </ChartCard>
  );
}

function CalibrationTab({ subject, infoSet }: { subject: Subject; infoSet: LadderSet }) {
  const oof = useOof({ subject, task: "classification", infoSet, model: "logistic" });
  if (oof.isLoading) return <ChartSkeleton height={300} label="Loading calibration data" />;
  if (oof.isError)
    return <ErrorState message="Could not load out-of-fold predictions." onRetry={() => oof.refetch()} />;
  if (!oof.data) return null;
  const { bins, ece } = binReliability(oof.data.y, oof.data.pred, 10);
  return (
    <ChartCard
      title="Calibration — logistic (L2)"
      subtitle="Do predicted probabilities match observed frequencies? The diagonal is perfect calibration."
      footerItems={[
        `n = ${fmtInt(oof.data.y.length)} OOF rows`,
        "3 reps pooled",
        "10 equal-width bins",
        `ECE ${fmtP(ece)}`,
      ]}
    >
      <ReliabilityDiagram bins={bins} ece={ece} />
    </ChartCard>
  );
}

function DecisionTab({ subject, infoSet }: { subject: Subject; infoSet: LadderSet }) {
  const oof = useOof({ subject, task: "classification", infoSet, model: "logistic" });
  if (oof.isLoading) return <ChartSkeleton height={300} label="Loading decision data" />;
  if (oof.isError)
    return <ErrorState message="Could not load out-of-fold predictions." onRetry={() => oof.refetch()} />;
  if (!oof.data) return null;
  const points = decisionCurve(oof.data.y, oof.data.pred, 21);
  return (
    <div className="flex flex-col gap-6">
      <ChartCard
        title="Precision & recall in the top-k"
        subtitle="Who gets reviewed first matters: precision and recall when acting on the k highest-scored students."
        footerItems={[
          `n = ${fmtInt(oof.data.y.length)} OOF rows`,
          "3 reps pooled",
          "logistic (L2)",
        ]}
      >
        <PrecisionAtK y={oof.data.y} pred={oof.data.pred} n={oof.data.y.length} />
      </ChartCard>
      <ChartCard
        title="Net benefit across decision thresholds"
        subtitle="Where acting on the model beats reviewing everyone or no one."
        footerItems={[
          `n = ${fmtInt(oof.data.y.length)} OOF rows`,
          "NB = TP/n − FP/n · t/(1−t)",
          "platinum line = no intervention",
        ]}
      >
        <DecisionCurve points={points} />
      </ChartCard>
    </div>
  );
}

function ExplanationsTab({ subject }: { subject: Subject }) {
  const stability = useStability(subject);
  if (stability.isLoading) return <ChartSkeleton height={300} label="Loading stability analysis" />;
  if (stability.isError)
    return <ErrorState message="Could not load the stability analysis." onRetry={() => stability.refetch()} />;
  if (!stability.data) return null;
  return (
    <div className="flex flex-col gap-6">
      <ChartCard
        title="Explanations — how the model ranks features"
        subtitle="If re-running the study with a different seed rewrites the story, the story was never real. Rankings across 5 bootstrap refits quantify that."
        footerItems={[
          `info set ${stability.data.infoSet}`,
          "logistic |β| · 5 refits, seeds 100–104",
          `cross-model Jaccard ${fmtP(stability.data.crossModelJaccard)}`,
        ]}
      >
        <StabilitySlope logistic={stability.data.logistic} />
      </ChartCard>
      <p className="max-w-[72ch] text-sm leading-relaxed text-ink-2">
        Contributions for individual predictions come from the exact linear decomposition for
        logistic models; tree explanations are path-based approximations. Coefficients describe
        associations in this dataset — they are not intervention advice.
      </p>
    </div>
  );
}

function FairnessTab({ subject }: { subject: Subject }) {
  const sub = useSubgroups(subject, "S2");
  if (sub.isLoading) return <ChartSkeleton height={300} label="Loading subgroup analysis" />;
  if (sub.isError)
    return <ErrorState message="Could not load the subgroup analysis." onRetry={() => sub.refetch()} />;
  if (!sub.data) return null;
  return (
    <ChartCard
      title="Subgroup behaviour at S2"
      subtitle="Recall with 500× bootstrap CIs per level. Wider bars on smaller groups say more about sample size than about fairness."
      footerItems={[
        `n = ${fmtInt(sub.data.overall.n)}`,
        "OOF at S2",
        "500× bootstrap CIs · min n 30",
        `threshold ${fmtP(sub.data.threshold, 2)}`,
      ]}
    >
      <SubgroupForest groups={sub.data.groups} overall={sub.data.overall} />
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        Model behaviour analysis — not a basis for decisions about individuals.
      </p>
    </ChartCard>
  );
}

function AblationTab({ subject }: { subject: Subject }) {
  const ablation = useAblation(subject);
  const transfer = useTransfer();
  const subjectName = subject === "math" ? "mathematics" : "Portuguese";
  return (
    <div className="flex flex-col gap-6">
      {ablation.isLoading ? (
        <ChartSkeleton height={240} label="Loading ablation" />
      ) : ablation.isError ? (
        <ErrorState message="Could not load the ablation study." onRetry={() => ablation.refetch()} />
      ) : ablation.data ? (
        <ChartCard
          title="Ablation — what does each feature group add?"
          subtitle="PR-AUC when dropping one group at a time from S2, on identical folds. Negative Δ means the group was carrying signal."
          footerItems={[
            `info set ${ablation.data.infoSet}`,
            "identical folds per drop",
            `full model ${fmtMetric(ablation.data.full.mean)}`,
          ]}
        >
          <AblationTable full={ablation.data.full} dropped={ablation.data.dropped} />
        </ChartCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {transfer.isLoading ? (
          <>
            <ChartSkeleton height={140} label="Loading transfer runs" />
            <ChartSkeleton height={140} label="Loading transfer runs" />
          </>
        ) : transfer.isError ? (
          <ErrorState
            className="md:col-span-2"
            message="Could not load the transfer runs."
            onRetry={() => transfer.refetch()}
          />
        ) : (
          transfer.data?.transfers.map((t) => (
            <div key={t.direction} className="rounded-[14px] border border-hairline bg-card p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-400">
                Cross-subject transfer
              </p>
              <p className="num mt-2 font-display text-2xl text-ink-1">{t.direction}</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="num text-sm text-ink-1">
                  PR-AUC <span className="text-gold-400">{fmtP(t.prAuc)}</span>
                </span>
                <span className="num text-xs text-ink-3">ROC-AUC {fmtP(t.rocAuc)}</span>
              </div>
              <EvidenceFooter
                n={t.nTrain}
                design={`train · tested on ${fmtInt(t.nTest)} unseen students`}
                extra="matched IDs excluded"
              />
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-ink-3">
        Transfer is fit on all of one subject and evaluated only on students of the other
        subject that are not matched pairs — no student appears in both sides
        {subjectName ? ` (${subjectName} results shown above)` : ""}.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- view */

export function ExperimentsView() {
  const [subject, setSubject] = useState<Subject>("math");
  const [task, setTask] = useState<Task>("classification");
  const [infoSet, setInfoSet] = useState<LadderSet>("S2");
  const [tab, setTab] = useState("comparison");

  const meta = useMeta();
  const exp = useExperiments(subject, task);
  const runs = exp.data?.runs ?? [];
  const metric = runs[0]?.primaryMetric ?? "prAuc";

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const finding = useMemo(() => {
    const model = task === "classification" ? "logistic" : "ridge";
    const pick = (tier: LadderSet) =>
      runs.find((r) => r.infoSet === tier && r.model === model)?.metrics[metric]?.mean ?? null;
    const s0 = pick("S0");
    const s4 = pick("S4");
    if (s0 == null || s4 == null) return null;
    const diff = s4 - s0;
    if (metric === "mae") {
      return diff < 0
        ? `Grades cut MAE from ${fmtP(s0)} to ${fmtP(s4)} (${signed(diff)} on 0–20)`
        : `Grades change MAE from ${fmtP(s0)} to ${fmtP(s4)} — the honest gain is modest`;
    }
    return diff > 0
      ? `Grades lift PR-AUC from ${fmtP(s0)} to ${fmtP(s4)} (+${fmtP(diff)})`
      : `Grades move PR-AUC from ${fmtP(s0)} to ${fmtP(s4)} — read the CIs before celebrating`;
  }, [runs, task, metric]);

  const isCls = task === "classification";

  return (
    <div className="flex flex-col gap-8">
      {/* --------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          overline="Experiments"
          title="The research instrument"
          description="One repeated, grouped, stratified cross-validation design; identical folds for every model and tier; baselines that keep us honest."
        />
        <div className="flex items-center gap-2">
          <PreregisteredChip />
          <ProtocolSheet subject={subject} />
        </div>
      </div>

      {/* ------------------------------------------------------- controls */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <ToggleGroup
          type="single"
          value={task}
          onValueChange={(v) => v && setTask(v as Task)}
          aria-label="Task"
        >
          <ToggleGroupItem value="classification">At-risk (G3 &lt; 10)</ToggleGroupItem>
          <ToggleGroupItem value="regression">Final grade (G3)</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={subject}
          onValueChange={(v) => v && setSubject(v as Subject)}
          aria-label="Subject"
        >
          <ToggleGroupItem value="math">Mathematics</ToggleGroupItem>
          <ToggleGroupItem value="por">Portuguese</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ---------------------------------------------------- info ladder */}
      <div className="rounded-[14px] border border-hairline bg-card p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-400">
            Information ladder
          </p>
          {meta.data?.infoSets[infoSet] ? (
            <p className="num text-[11px] text-ink-3">{meta.data.infoSets[infoSet].label}</p>
          ) : null}
        </div>
        <InformationLadder
          value={infoSet}
          onChange={setInfoSet}
          infoSets={meta.data?.infoSets ?? null}
        />
      </div>

      {/* ---------------------------------------------------- rail + tabs */}
      <div className="flex gap-8">
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <nav aria-label="Experiment sections" className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className="rounded-md px-3 py-2 text-left text-xs text-ink-3 transition-colors hover:bg-hover-surface hover:text-ink-1"
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* ------------------------------------------------ E1 hero */}
          <section id="E1" className="scroll-mt-24">
            {exp.isLoading ? (
              <ChartSkeleton height={440} label="Loading the accumulation curve" />
            ) : exp.isError ? (
              <ErrorState
                message="Could not load the experiment matrix. It may still be computing."
                onRetry={() => exp.refetch()}
              />
            ) : (
              <ChartCard
                title={finding ?? "The accumulation curve"}
                subtitle={`${subject === "math" ? "Mathematics" : "Portuguese"} · ${isCls ? "classification" : "regression"} · primary metric ${metricLabel(metric)} · champagne band = 95% CI of the primary model`}
                footerItems={[
                  "5×3 grouped stratified CV",
                  "seed 42",
                  "identical folds across tiers and models",
                  `${runs.length} runs`,
                ]}
              >
                <AccumulationCurve runs={runs} task={task} />
              </ChartCard>
            )}
          </section>

          {/* ------------------------------------------- E2..E7 gallery */}
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-6">
            <TabsList aria-label="Experiment views" className="flex-wrap">
              <TabsTrigger value="comparison">Model comparison</TabsTrigger>
              {isCls ? <TabsTrigger value="calibration">Calibration</TabsTrigger> : null}
              {isCls ? <TabsTrigger value="decision">Decision quality</TabsTrigger> : null}
              <TabsTrigger value="explanations">Explanations</TabsTrigger>
              <TabsTrigger value="fairness">Fairness</TabsTrigger>
              <TabsTrigger value="ablation">Ablation &amp; transfer</TabsTrigger>
            </TabsList>

            <section id="E2" className="scroll-mt-24">
              <TabsContent value="comparison" className="mt-0">
                <ComparisonTab runs={runs} infoSet={infoSet} task={task} />
              </TabsContent>
            </section>

            {isCls ? (
              <section id="E3" className="scroll-mt-24">
                <TabsContent value="calibration" className="mt-0">
                  <CalibrationTab subject={subject} infoSet={infoSet} />
                </TabsContent>
              </section>
            ) : null}

            {isCls ? (
              <section id="E4" className="scroll-mt-24">
                <TabsContent value="decision" className="mt-0">
                  <DecisionTab subject={subject} infoSet={infoSet} />
                </TabsContent>
              </section>
            ) : null}

            <section id="E5" className="scroll-mt-24">
              <TabsContent value="explanations" className="mt-0">
                <ExplanationsTab subject={subject} />
              </TabsContent>
            </section>

            <section id="E6" className="scroll-mt-24">
              <TabsContent value="fairness" className="mt-0">
                <FairnessTab subject={subject} />
              </TabsContent>
            </section>

            <section id="E7" className="scroll-mt-24">
              <TabsContent value="ablation" className="mt-0">
                <AblationTab subject={subject} />
              </TabsContent>
            </section>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
