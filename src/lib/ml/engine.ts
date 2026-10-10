/**
 * Engine orchestrator (plan §7–§12, API layer of the backend).
 *
 * Responsibilities:
 *  - ensureMatrix(): compute + persist the full experiment matrix once per
 *    process (memoized on globalThis so dev-server reloads reuse it).
 *  - getOverview / getStability / getAblation / getTransfer / getSubgroups /
 *    getHypotheses: every analysis the frontend needs, all computed from the
 *    real UCI Student Performance data via the verified ML core.
 *  - getPredictArtifact / predictRisk / explainPrediction: conformal-calibrated
 *    predictions with linear-model explanations, persisted to Postgres.
 */

import { db } from "../db";
import {
  atRisk,
  infoSetColumns,
  loadDataset,
  PASS_MARK,
  rowsFor,
  type StudentRow,
  type Subject,
} from "./dataset";
import {
  runCv,
  aggregateMetric,
  CLASSIFICATION_MODELS,
  REGRESSION_MODELS,
  type CvRunResult,
  type ModelKey,
  type Task,
} from "./runner";
import { stratifiedGroupKFold } from "./cv";
import {
  encodeSplits,
  transformEncoder,
  type ColType,
  type FittedEncoder,
} from "./encode";
import {
  fitLogistic,
  predictLogistic,
  sigmoid,
  fitForest,
  type LogisticModel,
  type TreeNode,
} from "./models";
import {
  bhAdjust,
  classifyMetrics,
  correctedResampledTTest,
  expectedCalibrationError,
  holmAdjust,
  meanAndCi,
  normalCdf,
  prAuc as prAucOf,
  rocAuc as rocAucOf,
} from "./metrics";
import {
  calibrateConformal,
  conformalInterval,
  conformalSet,
  type ConformalCalibration,
} from "./conformal";
import { kendallTau, linearContributions } from "./explain";
import { bootstrapIndices, makeRng, sampleIndices } from "./rng";
import { FEATURE_META, validateFeatures, type ValidationIssue } from "./featureMeta";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  issues?: ValidationIssue[];
  constructor(status: number, message: string, issues?: ValidationIssue[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

type Row = Record<string, string | number>;

function rowOf(r: StudentRow): Row {
  return r as unknown as Row;
}

function colTypesOf(rows: StudentRow[], cols: string[]): Record<string, ColType> {
  const types: Record<string, ColType> = {};
  const first = rowOf(rows[0]);
  for (const c of cols) types[c] = typeof first[c] === "number" ? "numeric" : "categorical";
  return types;
}

const INFO_SETS_ALL = ["S0", "S1", "S2", "S3", "S4", "S2-noabs"] as const;
const MATRIX_INFO_SETS = ["S0", "S1", "S2", "S3", "S4"] as const;

function keyOf(subject: string, task: string, infoSet: string, model: string): string {
  return `${subject}|${task}|${infoSet}|${model}`;
}

/** Per-fold paired differences of `metric` between two runs of DIFFERENT configs. */
function pairByFold(a: CvRunResult, b: CvRunResult, metric: string): number[] {
  const diffs: number[] = [];
  for (const fa of a.foldScores) {
    const fb = b.foldScores.find((f) => f.rep === fa.rep && f.fold === fa.fold);
    if (!fb) continue;
    const va = fa.metrics[metric];
    const vb = fb.metrics[metric];
    if (va != null && vb != null && Number.isFinite(va) && Number.isFinite(vb)) diffs.push(va - vb);
  }
  return diffs;
}

/* ------------------------------------------------------------------ */
/* 1. Experiment matrix (compute once, persist once)                   */
/* ------------------------------------------------------------------ */

interface MatrixState {
  runs: CvRunResult[];
  byKey: Map<string, CvRunResult>;
}

declare global {
  var __eduMatrix: MatrixState | undefined;
  var __eduMatrixPromise: Promise<CvRunResult[]> | undefined;
  var __eduCache: Map<string, unknown> | undefined;
}

function cacheMap(): Map<string, unknown> {
  if (!globalThis.__eduCache) globalThis.__eduCache = new Map();
  return globalThis.__eduCache;
}

function cacheGet<T>(key: string): T | undefined {
  return cacheMap().get(key) as T | undefined;
}

function cacheSet<T>(key: string, value: T): T {
  cacheMap().set(key, value);
  return value;
}

/** Persist every run; DB failures are logged, never fatal (plan §13.5). */
async function persistRuns(runs: CvRunResult[]): Promise<void> {
  let saved = 0;
  for (const r of runs) {
    const reps = r.foldScores.length ? Math.max(...r.foldScores.map((f) => f.rep)) + 1 : 0;
    const code = r.subject === "both" ? "E-POOLED-C" : `E-${r.task === "classification" ? "C" : "R"}-${r.infoSet}`;
    const data = {
      code,
      subject: r.subject,
      task: r.task,
      infoSet: r.infoSet,
      model: r.model,
      target: r.task === "classification" ? "at_risk" : "G3",
      nRows: r.nRows,
      metricName: r.primaryMetric,
      metrics: JSON.stringify({ nFeatures: r.nFeatures, primaryMetric: r.primaryMetric }),
      foldScores: JSON.stringify(r.foldScores),
      oofProbs: r.oof ? JSON.stringify(r.oof) : null,
      config: JSON.stringify({ reps, folds: 5, seed: 42, nFeatures: r.nFeatures }),
    };
    try {
      await db.experimentRun.upsert({
        where: {
          code_subject_task_infoSet_model: {
            code: data.code,
            subject: data.subject,
            task: data.task,
            infoSet: data.infoSet,
            model: data.model,
          },
        },
        create: data,
        update: data,
      });
      saved++;
    } catch (err) {
      console.error(`[engine] persist failed (${code}/${r.model}):`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[engine] persisted ${saved}/${runs.length} ExperimentRun rows`);
}

async function computeMatrix(): Promise<CvRunResult[]> {
  const t0 = Date.now();
  const runs: CvRunResult[] = [];
  for (const subject of ["math", "por"] as const) {
    for (const task of ["classification", "regression"] as const) {
      for (const infoSet of INFO_SETS_ALL) {
        const batch = runCv({
          subject,
          task,
          infoSet,
          reps: 3,
          folds: 5,
          seed: 42,
          collectOofFor: task === "classification" ? ["logistic"] : ["ridge"],
        });
        runs.push(...batch);
        // H4 needs paired forest OOF at S2 (identical folds — same seed).
        if (task === "classification" && infoSet === "S2") {
          const forestOof = runCv({
            subject,
            task: "classification",
            infoSet: "S2",
            models: ["forest"],
            reps: 3,
            folds: 5,
            seed: 42,
            collectOofFor: ["forest"],
          })[0];
          const mainForest = batch.find((r) => r.model === "forest");
          if (mainForest && forestOof?.oof) mainForest.oof = forestOof.oof;
        }
      }
    }
  }
  // Pooled (both subjects), logistic only — cross-subject generality (plan §7.2).
  for (const infoSet of MATRIX_INFO_SETS) {
    runs.push(
      ...runCv({
        subject: "both",
        task: "classification",
        infoSet,
        models: ["logistic"],
        reps: 2,
        folds: 5,
        seed: 42,
      })
    );
  }
  console.log(`[engine] matrix: ${runs.length} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await persistRuns(runs);
  return runs;
}

/** Compute + persist the full experiment matrix once; memoized thereafter. */
export async function ensureMatrix(): Promise<{ runs: CvRunResult[] }> {
  if (globalThis.__eduMatrix) return { runs: globalThis.__eduMatrix.runs };
  if (!globalThis.__eduMatrixPromise) {
    globalThis.__eduMatrixPromise = computeMatrix().then(
      (runs) => {
        const byKey = new Map<string, CvRunResult>();
        for (const r of runs) byKey.set(keyOf(r.subject, r.task, r.infoSet, r.model), r);
        globalThis.__eduMatrix = { runs, byKey };
        return runs;
      },
      (err) => {
        globalThis.__eduMatrixPromise = undefined; // allow retry
        throw err;
      }
    );
  }
  const runs = await globalThis.__eduMatrixPromise;
  return { runs };
}

/** Matrix runs if already computed (non-blocking — used by /overview, /predict). */
export function getMatrixIfReady(): CvRunResult[] | null {
  return globalThis.__eduMatrix ? globalThis.__eduMatrix.runs : null;
}

/** Fire-and-forget matrix warmup for route modules (no await). */
export function startMatrix(): void {
  void ensureMatrix().catch((err) =>
    console.error("[engine] matrix warmup failed:", err instanceof Error ? err.message : err)
  );
}

function findRun(
  subject: string,
  task: Task,
  infoSet: string,
  model: ModelKey
): CvRunResult | undefined {
  const m = globalThis.__eduMatrix;
  if (!m) return undefined;
  return m.byKey.get(keyOf(subject, task, infoSet, model));
}

/** Concatenated OOF predictions for one run (rows follow rowsFor order). */
function oofArrays(run: CvRunResult): { y: number[]; pred: number[] } {
  const y: number[] = [];
  const pred: number[] = [];
  for (const fold of run.oof ?? []) {
    y.push(...fold.y);
    pred.push(...fold.pred);
  }
  return { y, pred };
}

/* ------------------------------------------------------------------ */
/* 2. Overview (subject-level descriptive analytics)                   */
/* ------------------------------------------------------------------ */

export interface OverviewLevel {
  level: string;
  n: number;
  riskShare: number;
}
export interface OverviewAssociation {
  feature: string;
  type: "categorical" | "numeric";
  effect: "cramersV" | "cliffsDelta";
  value: number;
  p: number;
  q: number;
}
export interface OverviewResult {
  subject: string;
  kpis: {
    n: number;
    atRiskShare: number;
    meanG3: number;
    zeroG3Share: number;
    meanAbsences: number;
    matchedPairs?: number;
  };
  distributions: { grade: "G1" | "G2" | "G3"; bins: { value: number; count: number }[] }[];
  ridgeline: { grade: string; points: { x: number; density: number }[] }[];
  absencesHist: { bin: string; count: number }[];
  riskBySubgroup: { feature: string; levels: OverviewLevel[] }[];
  associations: OverviewAssociation[];
  g3ZeroCluster: { n: number; shareOfAll: number; meanAbsences: number; shareBelowPass: number };
  evidence: { passMark: number; dataset: string };
}

function chiSquareSf(x: number, df: number): number {
  // upper regularized incomplete gamma Q(df/2, x/2)
  const a = df / 2;
  const xx = x / 2;
  if (xx <= 0) return 1;
  if (xx < a + 1) {
    // series for P(a, x)
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n < 300; n++) {
      ap += 1;
      del *= xx / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    const p = sum * Math.exp(-xx + a * Math.log(xx) - logGammaLocal(a));
    return Math.max(0, Math.min(1, 1 - p));
  }
  // continued fraction for Q(a, x) (Lentz)
  const FPMIN = 1e-300;
  let b = xx + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  const q = Math.exp(-xx + a * Math.log(xx) - logGammaLocal(a)) * h;
  return Math.max(0, Math.min(1, q));
}

function logGammaLocal(x: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGammaLocal(1 - x);
  const z = x - 1;
  let a = 0.99999999999980993;
  const t = z + 7.5;
  for (let i = 0; i < 8; i++) a += g[i] / (z + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Cramér's V of a 2×L table (at-risk × levels) with chi-square p. */
function cramersV(levels: string[], y: number[]): { v: number; p: number } {
  const uniq = Array.from(new Set(levels));
  const n = levels.length;
  if (uniq.length < 2 || n === 0) return { v: 0, p: 1 };
  const rowTot = [0, 0];
  const colTot = new Array(uniq.length).fill(0);
  const cell: number[][] = [new Array(uniq.length).fill(0), new Array(uniq.length).fill(0)];
  for (let i = 0; i < n; i++) {
    const c = uniq.indexOf(levels[i]);
    const r = y[i] === 1 ? 1 : 0;
    cell[r][c] += 1;
    rowTot[r] += 1;
    colTot[c] += 1;
  }
  let chi2 = 0;
  for (const r of [0, 1]) {
    for (let c = 0; c < uniq.length; c++) {
      const e = (rowTot[r] * colTot[c]) / n;
      if (e > 0) chi2 += ((cell[r][c] - e) * (cell[r][c] - e)) / e;
    }
  }
  const v = Math.sqrt(chi2 / n); // min(2, L) − 1 = 1
  return { v, p: chiSquareSf(chi2, uniq.length - 1) };
}

/** Cliff's delta (at-risk vs not) with Mann–Whitney p (normal approx, tie-corrected). */
function cliffsDelta(values: number[], group: number[]): { delta: number; p: number } {
  const x1: number[] = [];
  const x2: number[] = [];
  for (let i = 0; i < values.length; i++) (group[i] === 1 ? x1 : x2).push(values[i]);
  const n1 = x1.length;
  const n2 = x2.length;
  if (n1 === 0 || n2 === 0) return { delta: 0, p: 1 };
  let gt = 0;
  let lt = 0;
  let ties = 0;
  for (const a of x1) {
    for (const b of x2) {
      if (a > b) gt += 1;
      else if (a < b) lt += 1;
      else ties += 1;
    }
  }
  const delta = (gt - lt) / (n1 * n2);
  const u = gt + ties / 2;
  const N = n1 + n2;
  const all = [...x1, ...x2].sort((a, b) => a - b);
  let tieSum = 0;
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j + 1 < all.length && all[j + 1] === all[i]) j += 1;
    const t = j - i + 1;
    if (t > 1) tieSum += t * (t * t - 1);
    i = j + 1;
  }
  const varU = ((n1 * n2) / 12) * (N + 1 - tieSum / (N * (N - 1)));
  const z = varU > 0 ? (u - (n1 * n2) / 2) / Math.sqrt(varU) : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { delta, p: Math.max(0, Math.min(1, p)) };
}

function gaussianKde(values: number[], grid: number[]): { x: number; density: number }[] {
  const n = Math.max(1, values.length);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, n - 1));
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))))];
  const iqr = q(0.75) - q(0.25);
  let h = 0.9 * Math.min(sd || iqr / 1.34 || 1, iqr / 1.34 || sd || 1) * Math.pow(n, -0.2);
  if (!Number.isFinite(h) || h <= 1e-6) h = Math.max(0.5, sd || 1);
  return grid.map((x) => {
    let s = 0;
    for (const v of values) {
      const u = (x - v) / h;
      s += Math.exp(-0.5 * u * u);
    }
    return { x, density: s / (n * h * Math.sqrt(2 * Math.PI)) };
  });
}

function ageBand(age: number): string {
  if (age <= 16) return "15-16";
  if (age <= 18) return "17-18";
  return "19+";
}

export async function getOverview(subject: Subject | "both"): Promise<OverviewResult> {
  const cached = cacheGet<OverviewResult>(`overview|${subject}`);
  if (cached) return cached;

  const rows = rowsFor(subject);
  const y = rows.map((r) => atRisk(r.G3));
  const n = rows.length;
  const atRiskCount = y.reduce<number>((a, b) => a + b, 0);
  const zeroRows = rows.filter((r) => r.G3 === 0);

  const kpis: OverviewResult["kpis"] = {
    n,
    atRiskShare: atRiskCount / n,
    meanG3: rows.reduce((a, r) => a + r.G3, 0) / n,
    zeroG3Share: zeroRows.length / n,
    meanAbsences: rows.reduce((a, r) => a + r.absences, 0) / n,
  };
  if (subject === "both") kpis.matchedPairs = loadDataset().nMatchedPairs;

  const distributions = (["G1", "G2", "G3"] as const).map((grade) => ({
    grade,
    bins: Array.from({ length: 21 }, (_, value) => ({
      value,
      count: rows.filter((r) => r[grade] === value).length,
    })),
  }));

  const grid: number[] = [];
  for (let x = 0; x <= 20.0001; x += 0.25) grid.push(Math.round(x * 100) / 100);
  const ridgeline = (["G1", "G2", "G3"] as const).map((grade) => ({
    grade,
    points: gaussianKde(
      rows.map((r) => r[grade]),
      grid
    ),
  }));

  const absEdges = [0, 5, 10, 15, 20, 25, 30, 35, 40, Infinity];
  const absLabels = ["0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39", "40+"];
  const absencesHist = absLabels.map((bin, i) => ({
    bin,
    count: rows.filter((r) => r.absences >= absEdges[i] && r.absences < absEdges[i + 1]).length,
  }));

  const subgroupDefs: { feature: string; value: (r: StudentRow) => string }[] = [
    { feature: "sex", value: (r) => r.sex },
    { feature: "school", value: (r) => r.school },
    { feature: "address", value: (r) => r.address },
    { feature: "ageBand", value: (r) => ageBand(r.age) },
    { feature: "higher", value: (r) => r.higher },
    { feature: "internet", value: (r) => r.internet },
    { feature: "romantic", value: (r) => r.romantic },
    { feature: "guardian", value: (r) => r.guardian },
  ];
  const riskBySubgroup = subgroupDefs.map(({ feature, value }) => {
    const levels = Array.from(new Set(rows.map(value))).sort();
    return {
      feature,
      levels: levels.map((level) => {
        const idx = rows.map((r, i) => (value(r) === level ? i : -1)).filter((i) => i >= 0);
        const risk = idx.reduce((a, i) => a + y[i], 0);
        return { level, n: idx.length, riskShare: idx.length ? risk / idx.length : 0 };
      }),
    };
  });

  // ---- associations (Cramér's V / Cliff's delta, BH-adjusted) ----
  const raw: Omit<OverviewAssociation, "q">[] = [];
  for (const meta of FEATURE_META) {
    if (meta.type === "categorical") {
      const { v, p } = cramersV(
        rows.map((r) => String((r as unknown as Row)[meta.name])),
        y
      );
      raw.push({ feature: meta.name, type: "categorical", effect: "cramersV", value: v, p });
    } else if (meta.name !== "G1" && meta.name !== "G2") {
      const { delta, p } = cliffsDelta(
        rows.map((r) => Number((r as unknown as Row)[meta.name])),
        y
      );
      raw.push({ feature: meta.name, type: "numeric", effect: "cliffsDelta", value: delta, p });
    }
  }
  const qs = bhAdjust(raw.map((a) => a.p));
  const associations: OverviewAssociation[] = raw
    .map((a, i) => ({ ...a, q: qs[i] }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const nAtRisk = atRiskCount;
  const g3ZeroCluster = {
    n: zeroRows.length,
    shareOfAll: zeroRows.length / n,
    meanAbsences: zeroRows.length ? zeroRows.reduce((a, r) => a + r.absences, 0) / zeroRows.length : 0,
    shareBelowPass: nAtRisk ? zeroRows.length / nAtRisk : 0,
  };

  const result: OverviewResult = {
    subject,
    kpis,
    distributions,
    ridgeline,
    absencesHist,
    riskBySubgroup,
    associations,
    g3ZeroCluster,
    evidence: { passMark: PASS_MARK, dataset: "UCI Student Performance (Cortez & Silva, 2008)" },
  };
  return cacheSet(`overview|${subject}`, result);
}

/* ------------------------------------------------------------------ */
/* 3. OOF accessor                                                     */
/* ------------------------------------------------------------------ */

export async function getOof(
  subject: Subject | "both",
  task: Task,
  infoSet: string,
  model: ModelKey
): Promise<{ y: number[]; pred: number[] }> {
  const key = `oof|${keyOf(subject, task, infoSet, model)}`;
  const cached = cacheGet<{ y: number[]; pred: number[] }>(key);
  if (cached) return cached;
  const run = findRun(subject, task, infoSet, model);
  if (run?.oof) return cacheSet(key, oofArrays(run));
  // matrix not ready (or OOF not collected) → compute a light 1-rep run
  const single = runCv({
    subject,
    task,
    infoSet,
    models: [model],
    reps: 1,
    folds: 5,
    seed: 42,
    collectOofFor: [model],
  })[0];
  return cacheSet(key, oofArrays(single));
}

/* ------------------------------------------------------------------ */
/* 4. Hypotheses (plan §8)                                             */
/* ------------------------------------------------------------------ */

export interface HypothesisDetail {
  comparison: string;
  delta: number;
  ci: [number, number] | null;
  pAdj: number | null;
}
export interface Hypothesis {
  id: string;
  title: string;
  decisionRule: string;
  status: "supported" | "not_supported" | "inconclusive";
  result: string;
  detail: HypothesisDetail[];
}

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "—");

function ecePerRep(run: CvRunResult): number[] {
  const reps = Math.max(...run.foldScores.map((f) => f.rep)) + 1;
  const out: number[] = [];
  const { y, pred } = oofArrays(run);
  let offset = 0;
  for (let rep = 0; rep < reps; rep++) {
    const len = (run.oof ?? []).filter((f) => f.rep === rep).reduce((a, f) => a + f.y.length, 0);
    const yr = y.slice(offset, offset + len);
    const pr = pred.slice(offset, offset + len);
    offset += len;
    out.push(expectedCalibrationError(yr, pr));
  }
  return out;
}

export async function getHypotheses(subject: Subject | "both"): Promise<{
  subject: string;
  hypotheses: Hypothesis[];
}> {
  await ensureMatrix();
  const cached = cacheGet<{ subject: string; hypotheses: Hypothesis[] }>(`hyp|${subject}`);
  if (cached) return cached;

  const cls = (infoSet: string) => findRun(subject, "classification", infoSet, "logistic");
  const reg = (infoSet: string) => findRun(subject, "regression", infoSet, "ridge");
  const rows = rowsFor(subject);
  const n = rows.length;
  const hypotheses: Hypothesis[] = [];

  // ---- H1: information tiers add signal ----
  const tierOrder = ["S0", "S1", "S2", "S3", "S4"];
  const h1Detail: HypothesisDetail[] = [];
  const h1P: number[] = [];
  const h1Mean: number[] = [];
  for (let i = 0; i < tierOrder.length - 1; i++) {
    const a = cls(tierOrder[i]);
    const b = cls(tierOrder[i + 1]);
    if (!a || !b) continue;
    const diffs = pairByFold(b, a, "prAuc"); // newer − older
    const t = correctedResampledTTest(diffs, 0.8 * n, 0.2 * n);
    const { ci } = meanAndCi(diffs);
    h1Detail.push({ comparison: `${tierOrder[i]}→${tierOrder[i + 1]} (PR-AUC)`, delta: t.meanDiff, ci, pAdj: t.p });
    h1P.push(t.p);
    h1Mean.push(t.meanDiff);
  }
  // regression detail (MAE — lower is better)
  const h1RegP: number[] = [];
  for (let i = 0; i < tierOrder.length - 1; i++) {
    const a = reg(tierOrder[i]);
    const b = reg(tierOrder[i + 1]);
    if (!a || !b) continue;
    const diffs = pairByFold(b, a, "mae");
    const t = correctedResampledTTest(diffs, 0.8 * n, 0.2 * n);
    const { ci } = meanAndCi(diffs);
    h1Detail.push({ comparison: `${tierOrder[i]}→${tierOrder[i + 1]} (MAE, lower is better)`, delta: t.meanDiff, ci, pAdj: t.p });
    h1RegP.push(t.p);
  }
  if (h1P.length) {
    const adj = holmAdjust(h1P);
    h1Detail.forEach((d, i) => {
      if (d.comparison.includes("PR-AUC")) d.pAdj = adj[i];
    });
  }
  const anySig = h1P.some((p, i) => adjSmall(p, h1P, i) && h1Mean[i] > 0);
  const bestJump = h1Mean.length ? h1Mean.indexOf(Math.max(...h1Mean)) : -1;
  hypotheses.push({
    id: "H1",
    title: "Performance increases with information tier",
    decisionRule: "≥1 adjacent tier jump with Holm-adjusted p < 0.05 and positive mean Δ PR-AUC (Nadeau–Bengio corrected t)",
    status: anySig ? "supported" : "not_supported",
    result:
      bestJump >= 0
        ? `Largest adjacent jump ${tierOrder[bestJump]}→${tierOrder[bestJump + 1]}: Δ PR-AUC = ${fmt(h1Mean[bestJump])}; ${anySig ? "at least one tier jump is significant after Holm correction" : "no tier jump is significant after Holm correction"} (4 paired tests, ${n} rows).`
        : "Insufficient runs to compare tiers.",
    detail: h1Detail,
  });

  // ---- H2: complex models do not beat regularized linear at S2 ----
  const s2 = findRun(subject, "classification", "S2", "logistic");
  const h2Detail: HypothesisDetail[] = [];
  const h2P: number[] = [];
  const h2Mean: number[] = [];
  for (const complex of ["tree", "forest"] as ModelKey[]) {
    const diffs = s2 ? runDiffs(subject, "classification", "S2", complex, "logistic", "prAuc") : [];
    if (!diffs.length) continue;
    const t = correctedResampledTTest(diffs, 0.8 * n, 0.2 * n);
    const { ci } = meanAndCi(diffs);
    h2Detail.push({ comparison: `${complex} − logistic (PR-AUC)`, delta: t.meanDiff, ci, pAdj: t.p });
    h2P.push(t.p);
    h2Mean.push(t.meanDiff);
  }
  if (h2P.length) {
    const adj = holmAdjust(h2P);
    h2Detail.forEach((d, i) => (d.pAdj = adj[i]));
  }
  const complexWins = h2P.some((p, i) => adjSmall(p, h2P, i) && h2Mean[i] > 0);
  hypotheses.push({
    id: "H2",
    title: "Complex models do NOT significantly outperform regularized linear at S2",
    decisionRule: "supported unless tree/forest beats logistic with Holm-adjusted p < 0.05 and positive mean Δ PR-AUC",
    status: complexWins ? "not_supported" : "supported",
    result: h2Detail.length
      ? `Δ PR-AUC vs logistic — tree: ${fmt(h2Mean[0])} (p_holm=${fmt(h2Detail[0].pAdj ?? 1)}), forest: ${h2Mean[1] !== undefined ? `${fmt(h2Mean[1])} (p_holm=${fmt(h2Detail[1].pAdj ?? 1)})` : "n/a"}. ${complexWins ? "A complex model is significantly better." : "Neither complex model significantly beats the L2-logistic."}`
      : "Insufficient runs.",
    detail: h2Detail,
  });

  // ---- H3: ridge does not significantly beat G3 = G2 at S4 ----
  const s4r = findRun(subject, "regression", "S4", "ridge");
  const g2 = findRun(subject, "regression", "S4", "g2rule");
  let h3: Hypothesis;
  if (s4r && g2) {
    const diffs = pairedDiffsLocal([s4r, g2], "ridge", "g2rule", "mae");
    const { ci } = meanAndCi(diffs);
    const supported = ci[0] <= 0 && ci[1] >= 0;
    h3 = {
      id: "H3",
      title: "Ridge does not significantly beat the G3 = G2 rule at S4 (regression)",
      decisionRule: "95% CI of paired Δ MAE (ridge − rule) includes 0 → supported",
      status: supported ? "supported" : "not_supported",
      result: `Δ MAE (ridge − G3=G2) = ${fmt(ci[0] !== ci[1] ? (ci[0] + ci[1]) / 2 : ci[0], 3)} [${fmt(ci[0])}, ${fmt(ci[1])}] — ${supported ? "the simple rule is not significantly worse (CI covers 0)" : "ridge is significantly better/worse than the rule"} (lower MAE is better).`,
      detail: [{ comparison: "ridge − g2rule (MAE)", delta: (ci[0] + ci[1]) / 2, ci, pAdj: null }],
    };
  } else {
    h3 = { id: "H3", title: "Ridge does not significantly beat the G3 = G2 rule at S4 (regression)", decisionRule: "95% CI of paired Δ MAE includes 0", status: "inconclusive", result: "Runs missing.", detail: [] };
  }
  hypotheses.push(h3);

  // ---- H4: logistic better calibrated than forest at S2 ----
  const logRun = findRun(subject, "classification", "S2", "logistic");
  const forestRun = findRun(subject, "classification", "S2", "forest");
  let h4: Hypothesis;
  if (logRun?.oof && forestRun?.oof) {
    const eL = ecePerRep(logRun);
    const eF = ecePerRep(forestRun);
    const diffs = eF.map((v, i) => v - eL[i]);
    const t = correctedResampledTTest(diffs, 0.8 * n, 0.2 * n);
    const { ci } = meanAndCi(diffs);
    const supported = t.meanDiff > 0 && t.p < 0.05;
    h4 = {
      id: "H4",
      title: "Logistic is better calibrated than the forest at S2",
      decisionRule: "paired per-rep ECE diffs (forest − logistic), corrected t; supported if mean > 0 and p < 0.05",
      status: supported ? "supported" : t.p < 0.05 ? "not_supported" : "inconclusive",
      result: `Δ ECE (forest − logistic) = ${fmt(t.meanDiff)} [${fmt(ci[0])}, ${fmt(ci[1])}], p = ${fmt(t.p)} — ${supported ? "logistic is significantly better calibrated" : t.p < 0.05 ? "the forest is significantly better calibrated" : "no significant calibration difference"} (3 reps).`,
      detail: [{ comparison: "forest − logistic (ECE)", delta: t.meanDiff, ci, pAdj: t.p }],
    };
  } else {
    h4 = { id: "H4", title: "Logistic is better calibrated than the forest at S2", decisionRule: "paired per-rep ECE diffs, corrected t", status: "inconclusive", result: "OOF predictions missing.", detail: [] };
  }
  hypotheses.push(h4);

  // ---- H5: explanations stable across seeds ----
  const st = await getStability(subject as Subject);
  const mj = st.logistic.meanJaccard;
  hypotheses.push({
    id: "H5",
    title: "Explanations are stable across seeds",
    decisionRule: "mean pairwise top-8 Jaccard of |β| across 5 bootstrap refits ≥ 0.6",
    status: mj >= 0.6 ? "supported" : "not_supported",
    result: `Mean top-8 Jaccard = ${fmt(mj)} (logistic, 5 refits) — ${mj >= 0.6 ? "feature attributions are stable" : "feature attributions are unstable"}; Kendall τ = ${fmt(st.logistic.kendall)}.`,
    detail: [{ comparison: "mean top-8 Jaccard (logistic)", delta: mj, ci: [mj, mj], pAdj: null }],
  });

  // ---- H6: subgroup recall differs by sex ----
  const oof = await subgroupOof(subject, "S2");
  const sexVals = oof.rows.map((r) => r.sex);
  const levels = Array.from(new Set(sexVals)).sort();
  if (levels.length === 2) {
    const gapOf = (idx: number[]) => {
      const rec = (lv: string) => {
        let tp = 0;
        let fn = 0;
        for (const i of idx) {
          if (sexVals[i] !== lv) continue;
          if (oof.y[i] === 1 && oof.pred[i] >= 0.5) tp += 1;
          else if (oof.y[i] === 1) fn += 1;
        }
        return tp + fn > 0 ? tp / (tp + fn) : NaN;
      };
      return rec(levels[1]) - rec(levels[0]);
    };
    const all = oof.y.map((_, i) => i);
    const gap = gapOf(all);
    const rng = makeRng(42);
    const boots: number[] = [];
    for (let b = 0; b < 1000; b++) {
      const idx: number[] = [];
      for (let i = 0; i < all.length; i++) idx.push(Math.floor(rng() * all.length));
      const g = gapOf(idx);
      if (Number.isFinite(g)) boots.push(g);
    }
    boots.sort((a, b) => a - b);
    const lo = boots[Math.floor(0.025 * boots.length)];
    const hi = boots[Math.floor(0.975 * boots.length)];
    const nByLevel = levels.map((lv) => sexVals.filter((s) => s === lv).length);
    const enough = nByLevel.every((m) => m >= 30);
    const excludes0 = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
    const [{ ci: ciF }, { ci: ciM }] = [meanAndCi([0]), meanAndCi([0])]; // placeholders, keep shape
    void ciF;
    void ciM;
    hypotheses.push({
      id: "H6",
      title: "Subgroup recall differs by sex",
      decisionRule: "bootstrap 95% CI of recall(M) − recall(F) excludes 0 and both levels have n ≥ 30",
      status: excludes0 && enough ? "supported" : "inconclusive",
      result: `Recall gap (M − F) = ${fmt(gap)} [${fmt(lo)}, ${fmt(hi)}] (1000 bootstrap resamples, OOF at S2); n per level: ${levels.map((lv, i) => `${lv}=${nByLevel[i]}`).join(", ")} — ${excludes0 && enough ? "the gap is significant" : "inconclusive (CI covers 0 or a level is too small)"}.`,
      detail: [{ comparison: "recall(M) − recall(F)", delta: gap, ci: [lo, hi], pAdj: null }],
    });
  } else {
    hypotheses.push({
      id: "H6",
      title: "Subgroup recall differs by sex",
      decisionRule: "bootstrap 95% CI of recall gap excludes 0 and both levels have n ≥ 30",
      status: "inconclusive",
      result: "OOF data does not contain two sex levels.",
      detail: [],
    });
  }

  return cacheSet(`hyp|${subject}`, { subject, hypotheses });
}

function adjSmall(p: number, family: number[], i: number): boolean {
  // Holm-adjusted significance for member i of the family
  const adj = holmAdjust(family);
  return adj[i] < 0.05;
}

function runDiffs(
  subject: string,
  task: Task,
  infoSet: string,
  a: ModelKey,
  b: ModelKey,
  metric: string
): number[] {
  const ra = findRun(subject, task, infoSet, a);
  const rb = findRun(subject, task, infoSet, b);
  if (!ra || !rb) return [];
  return pairedDiffsLocal([ra, rb], a, b, metric);
}

function pairedDiffsLocal(runs: CvRunResult[], a: ModelKey, b: ModelKey, metric: string): number[] {
  const ra = runs.find((r) => r.model === a);
  const rb = runs.find((r) => r.model === b);
  if (!ra || !rb) return [];
  const diffs: number[] = [];
  for (const fa of ra.foldScores) {
    const fb = rb.foldScores.find((f) => f.rep === fa.rep && f.fold === fa.fold);
    if (!fb) continue;
    const va = fa.metrics[metric];
    const vb = fb.metrics[metric];
    if (va != null && vb != null) diffs.push(va - vb);
  }
  return diffs;
}

/* ------------------------------------------------------------------ */
/* 5. Stability of explanations (plan §9)                              */
/* ------------------------------------------------------------------ */

export interface StabilitySeed {
  seed: number;
  top: { feature: string; score: number }[];
}
export interface StabilityModel {
  seeds: StabilitySeed[];
  meanJaccard: number;
  kendall: number;
}
export interface StabilityResult {
  infoSet: "S2";
  logistic: StabilityModel;
  forest: StabilityModel;
  crossModelJaccard: number;
}

function aggregateToRaw(names: string[], scores: ArrayLike<number>): Map<string, number> {
  const m = new Map<string, number>();
  for (let j = 0; j < names.length; j++) {
    const eq = names[j].indexOf("=");
    const raw = eq >= 0 ? names[j].slice(0, eq) : names[j];
    m.set(raw, (m.get(raw) ?? 0) + Math.abs(Number(scores[j])));
  }
  return m;
}

function topKMap(m: Map<string, number>, k: number): { feature: string; score: number }[] {
  return Array.from(m.entries())
    .map(([feature, score]) => ({ feature, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function jaccardSet(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const v of a) if (b.has(v)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 1;
}

function pairwiseStats(
  seeds: { top: { feature: string; score: number }[]; full: Map<string, number> }[]
): { meanJaccard: number; kendall: number } {
  let jSum = 0;
  let jN = 0;
  let tSum = 0;
  let tN = 0;
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      const si = new Set(seeds[i].top.map((t) => t.feature));
      const sj = new Set(seeds[j].top.map((t) => t.feature));
      jSum += jaccardSet(si, sj);
      jN += 1;
      const union = Array.from(new Set([...seeds[i].full.keys(), ...seeds[j].full.keys()]));
      const vi = union.map((f) => seeds[i].full.get(f) ?? 0);
      const vj = union.map((f) => seeds[j].full.get(f) ?? 0);
      tSum += kendallTau(vi, vj);
      tN += 1;
    }
  }
  return { meanJaccard: jN ? jSum / jN : 1, kendall: tN ? tSum / tN : 1 };
}

/** Local tree-interpreter global importance (mean |path contribution| per feature). */
function forestImportanceLocal(
  trees: TreeNode[],
  X: Float64Array,
  rows: number[],
  p: number
): number[] {
  const acc = new Float64Array(p);
  for (const i of rows) {
    const contrib = new Float64Array(p);
    for (const root of trees) {
      let node: TreeNode = root;
      while (!node.leaf) {
        const f = node.feat as number;
        const goRight = X[i * p + f] > (node.threshold as number);
        const child = (goRight ? node.right : node.left) as TreeNode;
        contrib[f] += Math.abs(child.value - node.value);
        node = child;
      }
    }
    for (let j = 0; j < p; j++) acc[j] += contrib[j] / trees.length;
  }
  return Array.from(acc, (v) => v / Math.max(1, rows.length));
}

export async function getStability(subject: Subject | "both"): Promise<StabilityResult> {
  const cached = cacheGet<StabilityResult>(`stability|${subject}`);
  if (cached) return cached;

  const rows = rowsFor(subject);
  const cols = infoSetColumns("S2");
  const types = colTypesOf(rows, cols);
  const target = (r: Row) => atRisk(Number(r.G3));

  // ---- logistic |β| across 5 bootstrap refits ----
  const logisticSeeds: { seed: number; top: { feature: string; score: number }[]; full: Map<string, number> }[] = [];
  for (const seed of [100, 101, 102, 103, 104]) {
    const idx = bootstrapIndices(rows.length, makeRng(seed));
    const boot = idx.map((i) => rows[i]);
    const enc = encodeSplits(boot.map(rowOf), boot.map(rowOf), cols, target, types);
    const m = fitLogistic(enc.train.X, enc.train.y, enc.train.n, enc.train.p);
    const agg = aggregateToRaw(enc.train.enc.names, m.beta);
    logisticSeeds.push({ seed, top: topKMap(agg, 8), full: agg });
  }

  // ---- forest importance across 3 bootstrap refits ----
  const forestSeeds: { seed: number; top: { feature: string; score: number }[]; full: Map<string, number> }[] = [];
  for (const seed of [200, 201, 202]) {
    const idx = bootstrapIndices(rows.length, makeRng(seed));
    const boot = idx.map((i) => rows[i]);
    const enc = encodeSplits(boot.map(rowOf), boot.map(rowOf), cols, target, types);
    const forest = fitForest(enc.train.X, enc.train.y, enc.train.n, enc.train.p, {
      nTrees: 25,
      maxDepth: 6,
      minLeaf: 5,
      seed,
    });
    const sampleRows = sampleIndices(enc.train.n, Math.min(200, enc.train.n), makeRng(seed + 50));
    const imp = forestImportanceLocal(forest.trees, enc.train.X, sampleRows, enc.train.p);
    const agg = aggregateToRaw(enc.train.enc.names, imp);
    forestSeeds.push({ seed, top: topKMap(agg, 8), full: agg });
  }

  const logisticStats = pairwiseStats(logisticSeeds);
  const forestStats = pairwiseStats(forestSeeds);

  let crossSum = 0;
  let crossN = 0;
  for (const l of logisticSeeds) {
    for (const f of forestSeeds) {
      crossSum += jaccardSet(new Set(l.top.map((t) => t.feature)), new Set(f.top.map((t) => t.feature)));
      crossN += 1;
    }
  }

  const result: StabilityResult = {
    infoSet: "S2",
    logistic: {
      seeds: logisticSeeds.map(({ seed, top }) => ({ seed, top })),
      meanJaccard: logisticStats.meanJaccard,
      kendall: logisticStats.kendall,
    },
    forest: {
      seeds: forestSeeds.map(({ seed, top }) => ({ seed, top })),
      meanJaccard: forestStats.meanJaccard,
      kendall: forestStats.kendall,
    },
    crossModelJaccard: crossN ? crossSum / crossN : 1,
  };
  return cacheSet(`stability|${subject}`, result);
}

/* ------------------------------------------------------------------ */
/* 6. Ablation (drop feature groups at S2)                             */
/* ------------------------------------------------------------------ */

export interface AblationResult {
  infoSet: "S2";
  full: { mean: number; ci: [number, number] };
  dropped: { group: string; mean: number; delta: number }[];
}

/** Local CV of the logistic model on an arbitrary column subset (same folds as runCv). */
function cvLogisticPrAuc(
  subject: Subject | "both",
  cols: string[],
  reps = 3,
  k = 5,
  seed = 42
): number[] {
  const rows = rowsFor(subject);
  const groups = rows.map((r) => r.groupId);
  const strata = rows.map((r) => atRisk(r.G3));
  const types = colTypesOf(rows, cols);
  const out: number[] = [];
  for (let rep = 0; rep < reps; rep++) {
    const { assign } = stratifiedGroupKFold(groups, strata, k, seed + rep * 1000);
    for (let f = 0; f < k; f++) {
      const trainIdx: number[] = [];
      const testIdx: number[] = [];
      for (let i = 0; i < rows.length; i++) (assign[i] === f ? testIdx : trainIdx).push(i);
      if (!trainIdx.length || !testIdx.length) continue;
      const { train, test } = encodeSplits(
        trainIdx.map((i) => rowOf(rows[i])),
        testIdx.map((i) => rowOf(rows[i])),
        cols,
        (r) => atRisk(Number(r.G3)),
        types
      );
      const m = fitLogistic(train.X, train.y, train.n, train.p);
      const preds = predictLogistic(m, test.X, test.n);
      const pr = classifyMetrics(test.y, preds).prAuc;
      if (pr != null) out.push(pr);
    }
  }
  return out;
}

export async function getAblation(subject: Subject | "both"): Promise<AblationResult> {
  const cached = cacheGet<AblationResult>(`ablation|${subject}`);
  if (cached) return cached;
  await ensureMatrix();

  const s2Cols = infoSetColumns("S2");
  const fullRun = findRun(subject, "classification", "S2", "logistic");
  const fullAgg = fullRun ? aggregateMetric([fullRun], "logistic", "prAuc") : null;
  const full = fullAgg
    ? { mean: fullAgg.mean, ci: fullAgg.ci }
    : (() => {
        const v = meanAndCi(cvLogisticPrAuc(subject, s2Cols));
        return { mean: v.mean, ci: v.ci };
      })();

  const groupCols = new Map<string, string[]>();
  for (const meta of FEATURE_META) {
    if (!s2Cols.includes(meta.name)) continue;
    const arr = groupCols.get(meta.group) ?? [];
    arr.push(meta.name);
    groupCols.set(meta.group, arr);
  }

  const dropped: AblationResult["dropped"] = [];
  for (const group of ["Background", "History & support", "Behavior & attendance"]) {
    const cols = groupCols.get(group) ?? [];
    const reduced = s2Cols.filter((c) => !cols.includes(c));
    const scores = cvLogisticPrAuc(subject, reduced);
    const { mean } = meanAndCi(scores);
    dropped.push({ group, mean, delta: mean - full.mean });
  }
  const noabs = findRun(subject, "classification", "S2-noabs", "logistic");
  const noabsAgg = noabs ? aggregateMetric([noabs], "logistic", "prAuc") : null;
  if (noabsAgg) dropped.push({ group: "absences", mean: noabsAgg.mean, delta: noabsAgg.mean - full.mean });

  return cacheSet(`ablation|${subject}`, { infoSet: "S2", full, dropped });
}

/* ------------------------------------------------------------------ */
/* 7. Cross-subject transfer                                           */
/* ------------------------------------------------------------------ */

export interface TransferResult {
  direction: string;
  nTrain: number;
  nTest: number;
  prAuc: number | null;
  rocAuc: number | null;
}

function transferFit(
  trainRows: StudentRow[],
  testRows: StudentRow[],
  cols: string[]
): { prAuc: number | null; rocAuc: number | null } {
  const types = colTypesOf(trainRows, cols);
  const { train, test } = encodeSplits(
    trainRows.map(rowOf),
    testRows.map(rowOf),
    cols,
    (r) => atRisk(Number(r.G3)),
    types
  );
  const m = fitLogistic(train.X, train.y, train.n, train.p);
  const p = predictLogistic(m, test.X, test.n);
  return { prAuc: prAucOf(test.y, p), rocAuc: rocAucOf(test.y, p) };
}

export function getTransfer(): TransferResult[] {
  const cached = cacheGet<TransferResult[]>("transfer");
  if (cached) return cached;
  const cols = infoSetColumns("S2");
  const math = rowsFor("math");
  const por = rowsFor("por");
  const mathGroups = new Set(math.map((r) => r.groupId));
  const porGroups = new Set(por.map((r) => r.groupId));
  const porHeld = por.filter((r) => !mathGroups.has(r.groupId));
  const mathHeld = math.filter((r) => !porGroups.has(r.groupId));
  const toPor = transferFit(math, porHeld, cols);
  const toMath = transferFit(por, mathHeld, cols);
  return cacheSet(
    "transfer",
    [
      { direction: "math→por", nTrain: math.length, nTest: porHeld.length, ...toPor },
      { direction: "por→math", nTrain: por.length, nTest: mathHeld.length, ...toMath },
    ]
  );
}

/* ------------------------------------------------------------------ */
/* 8. Subgroup fairness (OOF-aligned)                                  */
/* ------------------------------------------------------------------ */

export interface SubgroupLevel {
  level: string;
  n: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  recall: number;
  fpr: number;
  precision: number | null;
  ciRecall: [number, number] | null;
  insufficient: boolean;
}
export interface SubgroupsResult {
  subject: string;
  infoSet: string;
  threshold: number;
  overall: { recall: number; precision: number | null; n: number; brier: number; ece: number };
  groups: { feature: string; levels: SubgroupLevel[] }[];
}

interface SubgroupOof {
  rows: StudentRow[];
  y: number[];
  pred: number[];
}

async function subgroupOof(subject: Subject | "both", infoSet: string): Promise<SubgroupOof> {
  const key = `suboof|${subject}|${infoSet}`;
  const cached = cacheGet<SubgroupOof>(key);
  if (cached) return cached;
  const rows = rowsFor(subject);
  const cols = infoSetColumns(infoSet);
  const types = colTypesOf(rows, cols);
  const groups = rows.map((r) => r.groupId);
  const strata = rows.map((r) => atRisk(r.G3));
  const { assign, k } = stratifiedGroupKFold(groups, strata, 5, 42);
  const y = new Array<number>(rows.length).fill(0);
  const pred = new Array<number>(rows.length).fill(0);
  for (let f = 0; f < k; f++) {
    const trainIdx: number[] = [];
    const testIdx: number[] = [];
    for (let i = 0; i < rows.length; i++) (assign[i] === f ? testIdx : trainIdx).push(i);
    if (!trainIdx.length || !testIdx.length) continue;
    const { train, test } = encodeSplits(
      trainIdx.map((i) => rowOf(rows[i])),
      testIdx.map((i) => rowOf(rows[i])),
      cols,
      (r) => atRisk(Number(r.G3)),
      types
    );
    const m = fitLogistic(train.X, train.y, train.n, train.p);
    const p = predictLogistic(m, test.X, test.n);
    testIdx.forEach((rowIdx, j) => {
      y[rowIdx] = test.y[j];
      pred[rowIdx] = p[j];
    });
  }
  return cacheSet(key, { rows, y, pred });
}

export async function getSubgroups(subject: Subject | "both", infoSet = "S2"): Promise<SubgroupsResult> {
  const key = `subgroups|${subject}|${infoSet}`;
  const cached = cacheGet<SubgroupsResult>(key);
  if (cached) return cached;

  const { rows, y, pred } = await subgroupOof(subject, infoSet);
  const n = rows.length;
  const stats = (idx: number[]) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    for (const i of idx) {
      const p1 = pred[i] >= 0.5 ? 1 : 0;
      if (y[i] === 1 && p1 === 1) tp += 1;
      else if (y[i] === 0 && p1 === 1) fp += 1;
      else if (y[i] === 0 && p1 === 0) tn += 1;
      else fn += 1;
    }
    return { tp, fp, fn, tn };
  };

  const featureDefs: { feature: string; value: (r: StudentRow) => string }[] = [
    { feature: "sex", value: (r) => r.sex },
    { feature: "school", value: (r) => r.school },
    { feature: "address", value: (r) => r.address },
    { feature: "ageBand", value: (r) => ageBand(r.age) },
  ];
  const rng = makeRng(42);
  const groups = featureDefs.map(({ feature, value }) => {
    const levels = Array.from(new Set(rows.map(value))).sort();
    return {
      feature,
      levels: levels.map((level) => {
        const idx = rows.map((r, i) => (value(r) === level ? i : -1)).filter((i) => i >= 0);
        const { tp, fp, fn, tn } = stats(idx);
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        // bootstrap CI of recall (500 resamples, seed 42)
        const boots: number[] = [];
        for (let b = 0; b < 500; b++) {
          let btp = 0;
          let bfn = 0;
          for (let k = 0; k < idx.length; k++) {
            const i = idx[Math.floor(rng() * idx.length)];
            if (y[i] === 1) {
              if (pred[i] >= 0.5) btp += 1;
              else bfn += 1;
            }
          }
          if (btp + bfn > 0) boots.push(btp / (btp + bfn));
        }
        boots.sort((a, b) => a - b);
        const ciRecall: [number, number] | null =
          boots.length > 10 ? [boots[Math.floor(0.025 * boots.length)], boots[Math.floor(0.975 * boots.length)]] : null;
        return {
          level,
          n: idx.length,
          tp,
          fp,
          fn,
          tn,
          recall,
          fpr: fp + tn > 0 ? fp / (fp + tn) : 0,
          precision: tp + fp > 0 ? tp / (tp + fp) : null,
          ciRecall,
          insufficient: idx.length < 30,
        };
      }),
    };
  });

  const allIdx = rows.map((_, i) => i);
  const { tp, fp, fn } = stats(allIdx);
  const overall = {
    recall: tp + fn > 0 ? tp / (tp + fn) : 0,
    precision: tp + fp > 0 ? tp / (tp + fp) : null,
    n,
    brier: y.reduce((a, yi, i) => a + (pred[i] - yi) * (pred[i] - yi), 0) / n,
    ece: expectedCalibrationError(y, pred),
  };
  return cacheSet(key, { subject, infoSet, threshold: 0.5, overall, groups });
}

/* ------------------------------------------------------------------ */
/* 9. Prediction artifact (train + conformal calibration)              */
/* ------------------------------------------------------------------ */

export interface PredictArtifact {
  subject: string;
  infoSet: string;
  cols: string[];
  enc: FittedEncoder;
  model: LogisticModel;
  cal: ConformalCalibration;
  means: number[];
  baseRate: number;
  featureNames: string[];
  modelVersion: string;
  ece: number | null;
  nRows: number;
}

/** ECE of the logistic model at (subject, infoSet) — matrix if ready, else one on-demand run. */
function eceFor(subject: Subject | "both", infoSet: string): number | null {
  const key = `ece|${keyOf(subject, "classification", infoSet, "logistic")}`;
  const cachedEce = cacheGet<number | null>(key);
  if (cachedEce !== undefined) return cachedEce;
  const ready = getMatrixIfReady();
  let ece: number | null = null;
  const run = ready
    ? ready.find((r) => r.subject === subject && r.task === "classification" && r.infoSet === infoSet && r.model === "logistic")
    : undefined;
  if (run) {
    const agg = aggregateMetric([run], "logistic", "ece");
    ece = agg ? agg.mean : null;
  } else {
    const single = runCv({
      subject,
      task: "classification",
      infoSet,
      models: ["logistic"],
      reps: 3,
      folds: 5,
      seed: 42,
    })[0];
    const agg = single ? aggregateMetric([single], "logistic", "ece") : null;
    ece = agg ? agg.mean : null;
  }
  return cacheSet(key, ece);
}

export function getPredictArtifact(subject: Subject | "both", infoSet: string): PredictArtifact {
  const key = `artifact|${subject}|${infoSet}`;
  const cached = cacheGet<PredictArtifact>(key);
  if (cached) return cached;

  if (!INFO_SET_KNOWN(infoSet)) throw new ApiError(400, `Unknown info set "${infoSet}"`);
  const rows = rowsFor(subject);
  const cols = infoSetColumns(infoSet);
  const types = colTypesOf(rows, cols);
  const groups = rows.map((r) => r.groupId);
  const strata = rows.map((r) => atRisk(r.G3));
  const { assign, k } = stratifiedGroupKFold(groups, strata, 4, 7);
  const calFold = k - 1; // fold 3 of 0..3
  const trainRows: StudentRow[] = [];
  const calRows: StudentRow[] = [];
  rows.forEach((r, i) => (assign[i] === calFold ? calRows : trainRows).push(r));

  const enc = encodeSplits(
    trainRows.map(rowOf),
    calRows.map(rowOf),
    cols,
    (r) => atRisk(Number(r.G3)),
    types
  );
  const train = enc.train;
  const cal = enc.test;
  const model = fitLogistic(train.X, train.y, train.n, train.p);
  const calPred = predictLogistic(model, cal.X, cal.n);
  const cal0 = calibrateConformal(cal.y, calPred, 0.1);

  const means = new Array<number>(train.p).fill(0);
  for (let j = 0; j < train.p; j++) {
    let s = 0;
    for (let i = 0; i < train.n; i++) s += train.X[i * train.p + j];
    means[j] = s / Math.max(1, train.n);
  }

  const artifact: PredictArtifact = {
    subject,
    infoSet,
    cols,
    enc: train.enc,
    model,
    cal: cal0,
    means,
    baseRate: train.y.reduce((a, b) => a + b, 0) / Math.max(1, train.n),
    featureNames: train.enc.names,
    modelVersion: "1.0.0",
    ece: eceFor(subject, infoSet),
    nRows: train.n,
  };
  return cacheSet(key, artifact);
}

function INFO_SET_KNOWN(infoSet: string): boolean {
  return ["S0", "S1", "S2", "S3", "S4", "S2-noabs"].includes(infoSet);
}

/* ------------------------------------------------------------------ */
/* 10. predictRisk / explainPrediction                                 */
/* ------------------------------------------------------------------ */

export interface PredictionContribution {
  feature: string;
  value: string;
  contribution: number;
  direction: "toward_risk" | "away_from_risk";
  rank: number;
}

export interface PredictResult {
  id: string;
  subject: string;
  infoSet: string;
  probability: number;
  logOdds: number;
  interval: [number, number];
  conformalSet: number[];
  riskLevel: "lower" | "moderate" | "higher" | "uncertain";
  baseRate: number;
  contributions: PredictionContribution[];
  otherFactors: { count: number; contribution: number } | null;
  model: { name: string; infoSet: string; version: string; ece: number | null; n: number };
  issues: ValidationIssue[];
}

function computeContributions(
  artifact: PredictArtifact,
  clean: Record<string, string | number>
): { logit: number; p: number; sorted: { feature: string; value: string; contribution: number }[] } {
  const x = transformEncoder(artifact.enc, [clean]).X;
  let logit = artifact.model.intercept;
  for (let j = 0; j < artifact.model.p; j++) logit += artifact.model.beta[j] * x[j];
  const p = sigmoid(logit);

  const agg = new Map<string, { value: string; contribution: number }>();
  for (const c of linearContributions(artifact.model.beta, x, artifact.means, artifact.featureNames)) {
    const eq = c.name.indexOf("=");
    const raw = eq >= 0 ? c.name.slice(0, eq) : c.name;
    const display = raw in clean ? `${raw} = ${String(clean[raw])}` : raw;
    const prev = agg.get(raw);
    if (prev) prev.contribution += c.value;
    else agg.set(raw, { value: display, contribution: c.value });
  }
  const sorted = Array.from(agg.entries())
    .map(([feature, v]) => ({ feature, value: v.value, contribution: v.contribution }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { logit, p, sorted };
}

export async function predictRisk(
  subject: Subject | "both",
  infoSet: string,
  payload: Record<string, unknown>
): Promise<PredictResult> {
  if (!INFO_SET_KNOWN(infoSet)) throw new ApiError(400, `Unknown info set "${infoSet}"`);
  const { issues, clean } = validateFeatures(subject, infoSet, payload);
  if (issues.length) throw new ApiError(400, "Invalid features", issues);

  const artifact = getPredictArtifact(subject, infoSet);
  const { logit, p, sorted } = computeContributions(artifact, clean);
  const interval = conformalInterval(artifact.cal, p);
  const set = conformalSet(artifact.cal, p);
  const riskLevel: PredictResult["riskLevel"] =
    set.length !== 1 ? "uncertain" : p < 0.2 ? "lower" : p < 0.45 ? "moderate" : "higher";

  const top = sorted.slice(0, 12).map((c, i) => ({
    feature: c.feature,
    value: c.value,
    contribution: c.contribution,
    direction: (c.contribution > 0 ? "toward_risk" : "away_from_risk") as PredictionContribution["direction"],
    rank: i + 1,
  }));
  const rest = sorted.slice(12);
  const otherFactors = rest.length
    ? { count: rest.length, contribution: rest.reduce((a, c) => a + c.contribution, 0) }
    : null;

  const result: PredictResult = {
    id: "",
    subject,
    infoSet,
    probability: p,
    logOdds: logit,
    interval,
    conformalSet: set,
    riskLevel,
    baseRate: artifact.baseRate,
    contributions: top,
    otherFactors,
    model: {
      name: "Logistic (L2)",
      infoSet,
      version: artifact.modelVersion,
      ece: artifact.ece,
      n: artifact.nRows,
    },
    issues: [],
  };

  try {
    const created = await db.prediction.create({
      data: {
        subject,
        infoSet,
        model: "logistic",
        modelVersion: artifact.modelVersion,
        features: JSON.stringify(clean),
        probability: p,
        logOdds: logit,
        intervalLow: interval[0],
        intervalHigh: interval[1],
        conformalSet: JSON.stringify(set),
        riskLevel,
        explanations: {
          create: top.map((c) => ({
            feature: c.feature,
            value: c.value,
            contribution: c.contribution,
            direction: c.direction,
            rank: c.rank,
          })),
        },
      },
    });
    result.id = created.id;
  } catch (err) {
    console.error("[engine] prediction persist failed:", err instanceof Error ? err.message : err);
  }
  return result;
}

export async function explainPrediction(predictionId: string): Promise<{
  predictionId: string;
  baseRate: number;
  contributions: PredictionContribution[];
  finalProbability: number;
  note: string;
}> {
  const pred = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { explanations: { orderBy: { rank: "asc" } } },
  });
  if (!pred) throw new ApiError(404, "Prediction not found");

  let rows = pred.explanations;
  if (rows.length === 0) {
    // recompute from the stored feature payload via the artifact, then persist
    const features = JSON.parse(pred.features) as Record<string, string | number>;
    const artifact = getPredictArtifact(pred.subject as Subject, pred.infoSet);
    const { sorted } = computeContributions(artifact, features);
    const top = sorted.slice(0, 12).map((c, i) => ({
      feature: c.feature,
      value: c.value,
      contribution: c.contribution,
      direction: (c.contribution > 0 ? "toward_risk" : "away_from_risk") as string,
      rank: i + 1,
    }));
    try {
      await db.explanation.createMany({
        data: top.map((c) => ({
          predictionId: pred.id,
          feature: c.feature,
          value: c.value,
          contribution: c.contribution,
          direction: c.direction,
          rank: c.rank,
        })),
      });
    } catch (err) {
      console.error("[engine] explanation persist failed:", err instanceof Error ? err.message : err);
    }
    rows = await db.explanation.findMany({ where: { predictionId: pred.id }, orderBy: { rank: "asc" } });
  }

  const artifact = getPredictArtifact(pred.subject as Subject, pred.infoSet);
  return {
    predictionId: pred.id,
    baseRate: artifact.baseRate,
    contributions: rows.map((e) => ({
      feature: e.feature,
      value: e.value,
      contribution: e.contribution,
      direction: e.direction as PredictionContribution["direction"],
      rank: e.rank,
    })),
    finalProbability: pred.probability,
    note: "Associations learned by the model — not causes.",
  };
}

/* ------------------------------------------------------------------ */
/* 11. Experiments listing (aggregates for /api/experiments)           */
/* ------------------------------------------------------------------ */

export interface ExperimentRow {
  infoSet: string;
  model: ModelKey;
  nFeatures: number;
  primaryMetric: string;
  metrics: Record<string, { mean: number; sd: number; ci: [number, number]; n: number } | null>;
}

export async function getExperiments(
  subject: Subject | "both",
  task: Task
): Promise<{ subject: string; task: string; runs: ExperimentRow[] }> {
  await ensureMatrix();
  const modelOrder = task === "classification" ? CLASSIFICATION_MODELS : REGRESSION_MODELS;
  const infoOrder = [...MATRIX_INFO_SETS, "S2-noabs"];
  const runs: ExperimentRow[] = [];
  const m = globalThis.__eduMatrix;
  if (!m) return { subject, task, runs };
  for (const infoSet of infoOrder) {
    for (const model of modelOrder) {
      const run = m.byKey.get(keyOf(subject, task, infoSet, model));
      if (!run) continue;
      const metricKeys: string[] = [];
      for (const f of run.foldScores) {
        for (const k of Object.keys(f.metrics)) if (!metricKeys.includes(k)) metricKeys.push(k);
      }
      const metrics: ExperimentRow["metrics"] = {};
      for (const k of metricKeys) metrics[k] = aggregateMetric([run], model, k);
      runs.push({
        infoSet,
        model,
        nFeatures: run.nFeatures,
        primaryMetric: run.primaryMetric,
        metrics,
      });
    }
  }
  return { subject, task, runs };
}
