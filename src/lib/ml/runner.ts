/**
 * CV runner — repeated stratified grouped K-fold for the full experiment
 * matrix (plan §7, E1–E12). All models and tiers share identical folds per
 * (seed, rep) so every comparison is paired by fold.
 */

import { rowsFor, atRisk, infoSetColumns, assertNoLeakage, type StudentRow } from "./dataset";
import { stratifiedGroupKFold, assertGroupDisjoint } from "./cv";
import { encodeSplits, type ColType } from "./encode";
import {
  fitLogistic,
  predictLogistic,
  fitRidge,
  predictRidge,
  fitTree,
  predictTree,
  fitForest,
  predictForest,
  fitRiskRule,
  predictRiskRule,
  constantRate,
} from "./models";
import {
  classifyMetrics,
  regressionMetrics,
  meanAndCi,
  type ClassMetrics,
  type RegMetrics,
} from "./metrics";

export type Task = "classification" | "regression";

export type ModelKey =
  | "logistic"
  | "ridge"
  | "tree"
  | "forest"
  | "majority"
  | "mean"
  | "rule"
  | "g2rule"
  | "g1rule";

export const CLASSIFICATION_MODELS: ModelKey[] = ["logistic", "tree", "forest", "majority", "rule"];
export const REGRESSION_MODELS: ModelKey[] = ["ridge", "tree", "forest", "mean", "g2rule", "g1rule"];

export const MODEL_LABELS: Record<ModelKey, string> = {
  logistic: "Logistic (L2)",
  ridge: "Ridge",
  tree: "Decision tree",
  forest: "Random forest",
  majority: "Majority class",
  mean: "Mean G3",
  rule: "Rule (failures/absences)",
  g2rule: "G3 = G2",
  g1rule: "G3 = G1",
};

export const MODEL_FAMILY: Record<ModelKey, string> = {
  logistic: "linear",
  ridge: "linear",
  tree: "tree",
  forest: "ensemble",
  majority: "baseline",
  mean: "baseline",
  rule: "baseline",
  g2rule: "baseline",
  g1rule: "baseline",
};

export interface FoldScore {
  rep: number;
  fold: number;
  nTest: number;
  /** metric name → value (null when undefined, e.g. PR-AUC with no positives) */
  metrics: Record<string, number | null>;
}

export interface OofFold {
  rep: number;
  y: number[];
  pred: number[];
}

export interface CvRunResult {
  task: Task;
  subject: string;
  infoSet: string;
  model: ModelKey;
  nRows: number;
  nFeatures: number;
  featureNames: string[];
  /** primary metric name (prAuc for classification, mae for regression) */
  primaryMetric: string;
  foldScores: FoldScore[];
  /** out-of-fold predictions for selected models */
  oof?: OofFold[];
}

export interface CvOptions {
  subject: "math" | "por" | "both";
  task: Task;
  infoSet: string;
  models?: ModelKey[];
  reps?: number;
  folds?: number;
  seed?: number;
  collectOofFor?: ModelKey[];
}

function strataFor(rows: StudentRow[], task: Task): number[] {
  return rows.map((r) => {
    if (task === "classification") return atRisk(r.G3);
    const g = r.G3;
    if (g < 8) return 0;
    if (g < 10) return 1;
    if (g < 12) return 2;
    if (g < 14) return 3;
    return 4;
  });
}

function targetOf(row: StudentRow, task: Task): number {
  return task === "classification" ? atRisk(row.G3) : row.G3;
}

/** Run repeated stratified grouped CV for the requested models. */
export function runCv(opts: CvOptions): CvRunResult[] {
  const rows = rowsFor(opts.subject);
  const task = opts.task;
  const infoSet = opts.infoSet;
  const cols = infoSetColumns(infoSet);
  assertNoLeakage(cols, infoSet);
  const models = opts.models ?? (task === "classification" ? CLASSIFICATION_MODELS : REGRESSION_MODELS);
  const reps = opts.reps ?? 3;
  const k = opts.folds ?? 5;
  const seed = opts.seed ?? 42;
  const collectOof = new Set(opts.collectOofFor ?? models.filter((m) => MODEL_FAMILY[m] !== "baseline"));

  const groups = rows.map((r) => r.groupId);
  const strata = strataFor(rows, task);

  // determine column types from the first row
  const types: Record<string, ColType> = {};
  for (const c of cols) types[c] = typeof (rows[0] as unknown as Record<string, unknown>)[c] === "number" ? "numeric" : "categorical";

  const results = new Map<ModelKey, CvRunResult>();
  for (const m of models) {
    results.set(m, {
      task,
      subject: opts.subject,
      infoSet,
      model: m,
      nRows: rows.length,
      nFeatures: 0,
      featureNames: [],
      primaryMetric: task === "classification" ? "prAuc" : "mae",
      foldScores: [],
    });
  }
  const oofAcc = new Map<ModelKey, OofFold[]>();
  for (const m of collectOof) oofAcc.set(m, []);

  for (let rep = 0; rep < reps; rep++) {
    const { assign } = stratifiedGroupKFold(groups, strata, k, seed + rep * 1000);
    for (let f = 0; f < k; f++) {
      assertGroupDisjoint(groups, assign, f); // leakage guard (plan §11)
      const trainIdx: number[] = [];
      const testIdx: number[] = [];
      for (let i = 0; i < rows.length; i++) {
        (assign[i] === f ? testIdx : trainIdx).push(i);
      }
      if (trainIdx.length === 0 || testIdx.length === 0) continue;
      const trainRows = trainIdx.map((i) => rows[i]);
      const testRows = testIdx.map((i) => rows[i]);
      const { train, test } = encodeSplits(
        trainRows as unknown as Record<string, string | number>[],
        testRows as unknown as Record<string, string | number>[],
        cols,
        (r) => targetOf(r as unknown as StudentRow, task),
        types
      );

      for (const modelName of models) {
        let preds: Float64Array;
        switch (modelName) {
          case "logistic": {
            const m = fitLogistic(train.X, train.y, train.n, train.p);
            preds = predictLogistic(m, test.X, test.n);
            break;
          }
          case "ridge": {
            const m = fitRidge(train.X, train.y, train.n, train.p);
            preds = predictRidge(m, test.X, test.n);
            break;
          }
          case "tree": {
            const m = fitTree(train.X, train.y, train.n, train.p, {
              maxDepth: 4,
              minLeaf: 10,
              seed: seed + rep * 100 + f,
            });
            preds = predictTree(m, test.X, test.n);
            break;
          }
          case "forest": {
            const m = fitForest(train.X, train.y, train.n, train.p, {
              nTrees: 25,
              maxDepth: 6,
              minLeaf: 5,
              seed: seed + rep * 100 + f,
            });
            preds = predictForest(m, test.X, test.n);
            break;
          }
          case "majority":
          case "mean": {
            const c = constantRate(train.y);
            preds = new Float64Array(test.n).fill(c);
            break;
          }
          case "rule": {
            const rule = fitRiskRule(trainRows as unknown as Record<string, string | number>[]);
            preds = predictRiskRule(testRows as unknown as Record<string, string | number>[], rule);
            break;
          }
          case "g2rule": {
            preds = Float64Array.from(testRows.map((r) => r.G2));
            break;
          }
          case "g1rule": {
            preds = Float64Array.from(testRows.map((r) => r.G1));
            break;
          }
        }

        // metrics
        const metrics: Record<string, number | null> = {};
        if (task === "classification") {
          const cm = classifyMetrics(test.y, preds);
          metrics.prAuc = cm.prAuc;
          metrics.rocAuc = cm.rocAuc;
          metrics.balAcc = cm.balancedAcc;
          metrics.mcc = cm.mcc;
          metrics.precAt10 = cm.precisionAtK;
          metrics.recallAt10 = cm.recallAtK;
          metrics.brier = cm.brier;
          metrics.ece = cm.ece;
        } else {
          const rm = regressionMetrics(test.y, preds);
          metrics.mae = rm.mae;
          metrics.rmse = rm.rmse;
          metrics.r2 = rm.r2;
          metrics.spearman = rm.spearman;
        }

        const res = results.get(modelName) as CvRunResult;
        res.nFeatures = train.p;
        res.featureNames = train.enc.names;
        res.foldScores.push({ rep, fold: f, nTest: test.n, metrics });

        if (oofAcc.has(modelName)) {
          const arr = oofAcc.get(modelName) as OofFold[];
          arr.push({
            rep,
            y: Array.from(test.y).map((v) => Math.round(v * 1000) / 1000),
            pred: Array.from(preds).map((v) => Math.round(v * 10000) / 10000),
          });
        }
      }
    }
  }

  for (const [m, res] of results) {
    if (oofAcc.has(m)) res.oof = oofAcc.get(m);
  }
  return Array.from(results.values());
}

/** Aggregate a metric across folds (nulls skipped). */
export function aggregateMetric(
  runs: CvRunResult[],
  model: ModelKey,
  metric: string
): { mean: number; sd: number; ci: [number, number]; n: number } | null {
  const run = runs.find((r) => r.model === model);
  if (!run) return null;
  const vals = run.foldScores
    .map((f) => f.metrics[metric])
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));
  if (vals.length === 0) return null;
  const { mean, sd, ci } = meanAndCi(vals);
  return { mean, sd, ci, n: vals.length };
}

/** Paired per-fold differences between two models on the same metric. */
export function pairedDiffs(runs: CvRunResult[], a: ModelKey, b: ModelKey, metric: string): number[] {
  const ra = runs.find((r) => r.model === a);
  const rb = runs.find((r) => r.model === b);
  if (!ra || !rb) return [];
  const diffs: number[] = [];
  for (const fa of ra.foldScores) {
    const fb = rb.foldScores.find((f) => f.rep === fa.rep && f.fold === fa.fold);
    if (!fb) continue;
    const va = fa.metrics[metric];
    const vb = fb.metrics[metric];
    if (va !== null && va !== undefined && vb !== null && vb !== undefined) {
      diffs.push(va - vb);
    }
  }
  return diffs;
}
