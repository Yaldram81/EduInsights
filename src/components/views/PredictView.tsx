"use client";

/**
 * PredictView — the consultation room. Left: subject + information ladder
 * and the tier-filtered feature form. Right: the probability gauge, risk
 * badge, evidence waterfall and export actions. Server-side validation
 * issues are mapped under their fields.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartCard } from "@/components/charts/chartTheme";
import { Waterfall } from "@/components/charts/Waterfall";
import { ChevronDown } from "lucide-react";
import { CopyButton } from "@/components/data/CopyButton";
import { InformationLadder } from "@/components/data/InformationLadder";
import { ProbabilityGauge } from "@/components/data/ProbabilityGauge";
import { RiskBadge } from "@/components/data/RiskBadge";
import { SectionHeading } from "@/components/data/SectionHeading";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/data/States";
import {
  useExplain,
  useMeta,
  usePredict,
  type ExplainResponse,
  type FeatureIssue,
  type FeatureMeta,
  type InfoSet,
  type LadderSet,
  type PredictResponse,
  type Subject,
} from "@/lib/client/api";
import { fmtCi, fmtInt, fmtP } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormState = Record<string, string | number>;

const GROUPS = ["Background", "History & support", "Behavior & attendance", "Assessment"];

const conformalLabels = (set: number[]): string[] =>
  set.map((v) => (v === 1 ? "at risk (G3 < 10)" : "pass (G3 ≥ 10)"));

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1.5 rounded-xs border border-hairline px-2 py-0.5 text-[11px] text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

function FeatureField({
  f,
  value,
  issue,
  onChange,
}: {
  f: FeatureMeta;
  value: string | number;
  issue?: string;
  onChange: (v: string | number) => void;
}) {
  const id = `field-${f.name}`;
  const twoLevel = f.type === "categorical" && f.levels?.length === 2;

  let control: React.ReactNode;
  if (f.type === "categorical" && twoLevel) {
    control = (
      <ToggleGroup
        type="single"
        value={String(value)}
        onValueChange={(v) => v && onChange(v)}
        aria-label={f.label}
        className="justify-start"
      >
        {(f.levels ?? []).map((lvl) => (
          <ToggleGroupItem key={lvl} value={lvl} className="px-4 text-xs">
            {lvl}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  } else if (f.type === "categorical") {
    control = (
      <Select value={String(value)} onValueChange={(v) => onChange(v)}>
        <SelectTrigger id={id} className="w-full text-xs" aria-label={f.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(f.levels ?? []).map((lvl) => (
            <SelectItem key={lvl} value={lvl}>
              {lvl}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (
    f.min != null &&
    f.max != null &&
    f.max - f.min <= 4 &&
    (f.step ?? 1) === 1
  ) {
    control = (
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          value={[typeof value === "number" ? value : Number(value)]}
          min={f.min}
          max={f.max}
          step={f.step ?? 1}
          onValueChange={(vals: number[]) => onChange(vals[0] ?? f.min ?? 0)}
          aria-label={f.label}
          className="flex-1"
        />
        <span className="num w-8 text-right text-xs text-gold-400">{value}</span>
      </div>
    );
  } else {
    control = (
      <Input
        id={id}
        type="number"
        value={String(value)}
        min={f.min}
        max={f.max}
        step={f.step ?? 1}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        className="num h-8 w-28 text-xs"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-xs text-ink-2">
          {f.label}
        </Label>
      </div>
      {control}
      {f.description ? (
        <p className="text-[11px] leading-relaxed text-ink-4">{f.description}</p>
      ) : null}
      {issue ? (
        <p className="text-[11px] text-ruby" role="alert">
          {issue}
        </p>
      ) : null}
    </div>
  );
}

export function PredictView() {
  const meta = useMeta();
  const predict = usePredict();
  const explain = useExplain();

  const [subject, setSubject] = useState<Subject>("math");
  const [infoSet, setInfoSet] = useState<LadderSet>("S2");
  const [overrides, setOverrides] = useState<FormState>({});
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const infoSets = meta.data?.infoSets;

  /* Defaults are derived, never stored: they track the information ladder
     and the metadata automatically, so no reset effect is needed. User
     edits live in `overrides` and are cleared by the change handlers. */
  const defaults = useMemo<FormState>(() => {
    const all = meta.data?.featureMeta ?? [];
    const tiers = infoSets?.[infoSet]?.tiers ?? [];
    const next: FormState = {};
    for (const f of all) {
      if (!tiers.includes(f.tier)) continue;
      if (f.type === "categorical") next[f.name] = f.levels?.[0] ?? "";
      else if (f.min != null && f.max != null) next[f.name] = Math.round((f.min + f.max) / 2);
      else next[f.name] = 0;
    }
    return next;
  }, [meta.data, infoSet, infoSets]);

  const form = useMemo<FormState>(
    () => ({ ...defaults, ...overrides }),
    [defaults, overrides],
  );

  const visible = useMemo(() => {
    const all = meta.data?.featureMeta ?? [];
    const tiers = infoSets?.[infoSet]?.tiers ?? [];
    return all.filter((f) => tiers.includes(f.tier));
  }, [meta.data, infoSet, infoSets]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, FeatureMeta[]>();
    for (const f of visible) {
      const list = byGroup.get(f.group) ?? [];
      list.push(f);
      byGroup.set(f.group, list);
    }
    return GROUPS.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      features: byGroup.get(g) ?? [],
    }));
  }, [visible]);

  /* Subject / ladder changes are user events: they clear edits, field
     issues and any previous estimate. */
  const resetWorkspace = () => {
    setOverrides({});
    setIssues({});
    setResult(null);
    setExplanation(null);
    setExplainError(null);
  };

  const changeSubject = (v: Subject) => {
    if (v === subject) return;
    setSubject(v);
    resetWorkspace();
  };

  const changeInfoSet = (v: LadderSet) => {
    if (v === infoSet) return;
    setInfoSet(v);
    resetWorkspace();
  };

  const setField = (name: string, v: string | number) =>
    setOverrides((prev) => ({ ...prev, [name]: v }));

  const submit = () => {
    setIssues({});
    predict.mutate(
      { subject, infoSet, features: form },
      {
        onSuccess: (res) => {
          setResult(res);
          setExplanation(null);
          setExplainError(null);
        },
        onError: (err) => {
          const body = (err as { body?: { issues?: FeatureIssue[] } }).body;
          if (body?.issues?.length) {
            const map: Record<string, string> = {};
            for (const i of body.issues) map[i.feature] = i.message;
            setIssues(map);
          }
        },
      },
    );
  };

  const wfBase = explanation ? explanation.baseRate : result?.baseRate;
  const wfContribs = explanation ? explanation.contributions : result?.contributions ?? [];
  const wfFinal = explanation ? explanation.finalProbability : result?.probability;
  const wfInterval = result?.interval;

  const copyText = result
    ? [
        "EduInsight AI — risk estimate",
        `Subject: ${subject === "math" ? "mathematics" : "Portuguese"} · info set ${result.infoSet}`,
        `Estimated probability: ${fmtP(result.probability)} (90% conformal interval ${fmtCi(result.interval)})`,
        `Model: ${result.model.name} · ECE ${result.model.ece != null ? fmtP(result.model.ece) : "—"} · n = ${fmtInt(result.model.n)}`,
        "",
        "Top factors:",
        ...result.contributions.map(
          (c) => `- ${c.value}: ${c.contribution >= 0 ? "+" : ""}${c.contribution.toFixed(3)} (${c.direction === "toward_risk" ? "toward risk" : "away from risk"})`,
        ),
        ...(result.otherFactors
          ? [`- Other factors (${result.otherFactors.count}): ${result.otherFactors.contribution >= 0 ? "+" : ""}${result.otherFactors.contribution.toFixed(3)}`]
          : []),
        "",
        "Associations, not causes. Research prototype — not for decisions about real students.",
      ].join("\n")
    : "";

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eduinsight-prediction-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subjectLabel = subject === "math" ? "mathematics" : "Portuguese";

  return (
    <div className="flex flex-col gap-8">
      {/* --------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          overline="Predict"
          title="The consultation room"
          description="Choose how much information is available, describe a student, and receive a calibrated estimate — with a conformal interval, a conformal set and the full evidence trail."
        />
        <Chip className="border-amber/40 text-amber">
          <AlertTriangle className="size-3" aria-hidden />
          research prototype — not for real students
        </Chip>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ------------------------------------------------------ form */}
        <div className="flex flex-col gap-6">
          <div className="rounded-[14px] border border-hairline bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-400">
                Subject
              </p>
              <ToggleGroup
                type="single"
                value={subject}
                onValueChange={(v) => v && changeSubject(v as Subject)}
                aria-label="Subject"
              >
                <ToggleGroupItem value="math" className="px-3 text-xs">
                  Math
                </ToggleGroupItem>
                <ToggleGroupItem value="por" className="px-3 text-xs">
                  Portuguese
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <InformationLadder
              value={infoSet}
              onChange={(v) => changeInfoSet(v)}
              infoSets={infoSets ?? null}
            />
          </div>

          <div className="rounded-[14px] border border-hairline bg-card p-6">
            {meta.isLoading ? (
              <PanelSkeleton rows={5} />
            ) : meta.isError ? (
              <ErrorState message="Could not load the feature metadata." onRetry={() => meta.refetch()} />
            ) : (
              <div className="flex flex-col gap-2">
                {groups.map((g, gi) => (
                  <Collapsible key={g.group} defaultOpen={gi < 2}>
                    <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-2 py-2.5 text-left transition-colors hover:bg-hover-surface">
                      <span className="flex items-center gap-2 text-sm font-medium text-ink-1">
                        <span className="num text-[10px] text-ink-4">
                          {String(gi + 1).padStart(2, "0")}
                        </span>
                        {g.group}
                      </span>
                      <ChevronDown className="size-4 text-ink-3 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col gap-4 px-2 pb-4 pt-2">
                      {g.features.map((f) => (
                        <FeatureField
                          key={f.name}
                          f={f}
                          value={form[f.name] ?? ""}
                          issue={issues[f.name]}
                          onChange={(v) => setField(f.name, v)}
                        />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={submit}
              disabled={predict.isPending || meta.isLoading}
              className="grad-gold mt-5 w-full border-0 font-medium text-[#1A1405] hover:opacity-90"
            >
              {predict.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Estimating…
                </>
              ) : (
                "Estimate risk"
              )}
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------- result */}
        <div aria-live="polite" className="flex min-w-0 flex-col gap-6">
          {predict.isError && !predict.isPending ? (
            <ErrorState message="The estimate was rejected. Check the highlighted fields on the left and try again." />
          ) : null}

          {!result ? (
            <div className="rounded-[14px] border border-hairline bg-card p-6">
              <EmptyState
                title="No estimate yet"
                hint="Estimate risk to see the gauge and the evidence waterfall. Predictions include a 90% conformal interval — uncertainty is part of the answer."
              />
            </div>
          ) : (
            <>
              {/* gauge + badge */}
              <div className="rounded-[14px] border border-hairline bg-card p-6">
                <div className="grid items-center gap-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                  <ProbabilityGauge
                    probability={result.probability}
                    interval={result.interval}
                  />
                  <div className="flex min-w-0 flex-col gap-3">
                    <RiskBadge level={result.riskLevel} probability={result.probability} interval={result.interval} />
                    <div className="flex flex-wrap gap-2">
                      {result.conformalSet.length >= 2 ? (
                        <Chip>conformal set spans both labels</Chip>
                      ) : (
                        <Chip>conformal set: {conformalLabels(result.conformalSet).join(", ")}</Chip>
                      )}
                      <Chip>
                        model: {result.model.name} · {result.model.infoSet}
                      </Chip>
                      {result.model.ece != null ? <Chip>ECE {fmtP(result.model.ece)}</Chip> : null}
                      <Chip>n = {fmtInt(result.model.n)}</Chip>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-3">
                      The interval is a 90% split-conformal band on held-out calibration folds;
                      when it spans the 0.5 decision threshold the honest reading is
                      &ldquo;uncertain&rdquo;, whatever the point estimate suggests.
                    </p>
                  </div>
                </div>
              </div>

              {/* waterfall */}
              <ChartCard
                title="Evidence waterfall"
                subtitle={
                  wfBase != null
                    ? `From a base rate of ${fmtP(wfBase)} to ${fmtP(wfFinal ?? 0)} for this student — in log-odds space.`
                    : undefined
                }
                footerItems={[
                  `subject ${subjectLabel}`,
                  `info set ${result.infoSet}`,
                  explanation ? "explanation recomputed on the server" : "exact linear decomposition",
                ]}
              >
                {wfBase != null && wfContribs.length > 0 && wfFinal != null ? (
                  <Waterfall
                    baseRate={wfBase}
                    contributions={wfContribs}
                    finalProbability={wfFinal}
                    interval={wfInterval}
                  />
                ) : (
                  <p className="text-sm text-ink-3">No contributions available.</p>
                )}
              </ChartCard>

              {/* actions */}
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton text={copyText} label="Copy explanation as text" />
                <Button variant="outline" size="sm" onClick={downloadJson} className="border-hairline-strong">
                  <Download className="size-3.5" aria-hidden />
                  Download JSON
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    explain.mutate(
                      { predictionId: result.id },
                      {
                        onSuccess: (res) => {
                          setExplanation(res);
                          setExplainError(null);
                        },
                        onError: () => setExplainError("The server could not recompute the explanation."),
                      },
                    )
                  }
                  disabled={explain.isPending}
                >
                  {explain.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-3.5" aria-hidden />
                  )}
                  Recompute explanation on the server
                </Button>
              </div>
              {explainError ? <p className="text-xs text-ruby">{explainError}</p> : null}
              {explanation?.note ? (
                <p className="text-xs italic text-ink-3">{explanation.note}</p>
              ) : null}
            </>
          )}

          {/* notice */}
          <div className="rounded-[14px] border border-dashed border-amber/50 bg-amber/5 p-5">
            <p className="text-sm font-medium text-amber">
              Research prototype — not for decisions about real students.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              The model estimates associations, not causes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
