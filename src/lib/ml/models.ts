/**
 * Model families — plan §6. Fixed, documented hyperparameters per family;
 * identical (zero) inner-tuning budget for every family so comparisons are
 * not confounded by differential tuning.
 *
 * - Logistic (L2): Newton–IRLS on standardized features  (see ./logistic)
 * - Ridge: closed form via Cholesky
 * - CART: histogram-based (global 16-bin quantization per fold, MSE gain)
 * - Random forest: bagged histogram trees, seeded bootstrap, sqrt(p) mtry
 * - Baselines: constant rate / mean / "G3 = G2" / "G3 = G1" rules
 */

import { makeRng, shuffledIndices } from "./rng";
import { solveSPD } from "./solve";
import {
  fitLogistic,
  predictLogistic,
  sigmoid,
  type LogisticModel,
} from "./logistic";

export { fitLogistic, predictLogistic, sigmoid };
export type { LogisticModel };

/* ------------------------------------------------------------------ */
/* Ridge regression (closed form)                                      */
/* ------------------------------------------------------------------ */

export interface RidgeModel {
  beta: Float64Array;
  intercept: number;
  p: number;
}

export function fitRidge(X: Float64Array, y: Float64Array, n: number, p: number, lambda = 1.0): RidgeModel {
  const q = p + 1;
  const XtX = new Float64Array(q * q);
  const Xty = new Float64Array(q);
  for (let i = 0; i < n; i++) {
    const off = i * p;
    for (let j = 0; j <= p; j++) {
      const xj = j < p ? X[off + j] : 1;
      Xty[j] += xj * y[i];
      for (let k = j; k <= p; k++) {
        const xk = k < p ? X[off + k] : 1;
        XtX[j * q + k] += xj * xk;
      }
    }
  }
  for (let j = 0; j <= p; j++) {
    for (let k = 0; k < j; k++) XtX[j * q + k] = XtX[k * q + j];
    if (j < p) XtX[j * q + j] += lambda;
  }
  const sol = solveSPD(XtX, Xty, q);
  const beta = new Float64Array(p);
  if (sol) {
    for (let j = 0; j < p; j++) beta[j] = sol[j];
    return { beta, intercept: sol[p], p };
  }
  return { beta, intercept: 0, p };
}

export function predictRidge(m: RidgeModel, X: Float64Array, n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = m.intercept;
    const off = i * m.p;
    for (let j = 0; j < m.p; j++) z += m.beta[j] * X[off + j];
    out[i] = z;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Histogram CART (MSE gain — works for regression and 0/1 labels)     */
/* ------------------------------------------------------------------ */

export interface TreeNode {
  leaf: boolean;
  value: number; // mean of y at node
  n: number; // training rows reaching node (cover)
  feat?: number; // split feature index
  threshold?: number; // split: value > threshold → right
  left?: TreeNode;
  right?: TreeNode;
}

export interface TreeOptions {
  maxDepth: number;
  minLeaf: number;
  maxBins?: number; // default 16
  mtry?: number; // features considered per node (0 = all)
  seed?: number;
}

/** Global quantile bin edges per feature, fitted on the training fold. */
export function fitBinEdges(X: Float64Array, rowIdx: number[], p: number, maxBins = 16): Float64Array[] {
  const edges: Float64Array[] = [];
  for (let j = 0; j < p; j++) {
    const vals: number[] = [];
    for (const i of rowIdx) vals.push(X[i * p + j]);
    vals.sort((a, b) => a - b);
    const n = vals.length;
    const lo = vals[0];
    const hi = vals[n - 1];
    if (hi - lo < 1e-12) {
      edges.push(new Float64Array(0));
      continue;
    }
    const e: number[] = [];
    for (let b = 1; b < maxBins; b++) {
      const q = (b / maxBins) * (n - 1);
      const loI = Math.floor(q);
      const hiI = Math.ceil(q);
      const v = loI === hiI ? vals[loI] : vals[loI] + (vals[hiI] - vals[loI]) * (q - loI);
      if (v > lo && v < hi && (e.length === 0 || v > e[e.length - 1] + 1e-12)) e.push(v);
    }
    edges.push(Float64Array.from(e));
  }
  return edges;
}

function binOf(v: number, edges: Float64Array): number {
  let lo = 0;
  let hi = edges.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (v > edges[mid]) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function buildHistNode(
  X: Float64Array,
  y: Float64Array,
  rowIdx: number[],
  p: number,
  bins: Float64Array[],
  depth: number,
  maxDepth: number,
  minLeaf: number,
  mtry: number,
  rng: () => number
): TreeNode {
  let S = 0;
  for (const i of rowIdx) S += y[i];
  const node: TreeNode = { leaf: true, value: S / rowIdx.length, n: rowIdx.length };
  if (depth >= maxDepth || rowIdx.length < 2 * minLeaf) return node;

  let feats: number[];
  if (mtry > 0 && mtry < p) {
    feats = shuffledIndices(p, rng).slice(0, mtry);
  } else {
    feats = Array.from({ length: p }, (_, j) => j);
  }

  let bestGain = 1e-10;
  let bestFeat = -1;
  let bestBin = -1;
  const nTot = rowIdx.length;

  for (const j of feats) {
    const e = bins[j];
    if (e.length === 0) continue;
    const nb = e.length + 1;
    const sumBin = new Float64Array(nb);
    const cntBin = new Int32Array(nb);
    for (const i of rowIdx) {
      const b = binOf(X[i * p + j], e);
      sumBin[b] += y[i];
      cntBin[b]++;
    }
    let SL = 0;
    let nL = 0;
    for (let b = 0; b < nb - 1; b++) {
      SL += sumBin[b];
      nL += cntBin[b];
      const nR = nTot - nL;
      if (nL < minLeaf || nR < minLeaf) continue;
      const SR = S - SL;
      const gain = (SL * SL) / nL + (SR * SR) / nR - (S * S) / nTot;
      if (gain > bestGain) {
        bestGain = gain;
        bestFeat = j;
        bestBin = b;
      }
    }
  }
  if (bestFeat < 0) return node;

  const thr = bins[bestFeat][bestBin];
  const leftIdx: number[] = [];
  const rightIdx: number[] = [];
  for (const i of rowIdx) {
    if (X[i * p + bestFeat] <= thr) leftIdx.push(i);
    else rightIdx.push(i);
  }
  if (leftIdx.length === 0 || rightIdx.length === 0) return node;

  node.leaf = false;
  node.feat = bestFeat;
  node.threshold = thr;
  node.left = buildHistNode(X, y, leftIdx, p, bins, depth + 1, maxDepth, minLeaf, mtry, rng);
  node.right = buildHistNode(X, y, rightIdx, p, bins, depth + 1, maxDepth, minLeaf, mtry, rng);
  return node;
}

export interface TreeModel {
  root: TreeNode;
  p: number;
}

export function fitTree(X: Float64Array, y: Float64Array, n: number, p: number, opts: TreeOptions): TreeModel {
  const maxDepth = opts.maxDepth;
  const minLeaf = opts.minLeaf;
  const maxBins = opts.maxBins ?? 16;
  const mtry = opts.mtry ?? 0;
  const rowIdx = Array.from({ length: n }, (_, i) => i);
  const bins = fitBinEdges(X, rowIdx, p, maxBins);
  const rng = makeRng(opts.seed ?? 42);
  return { root: buildHistNode(X, y, rowIdx, p, bins, 0, maxDepth, minLeaf, mtry, rng), p };
}

export function predictTree(m: TreeModel, X: Float64Array, n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let nd: TreeNode = m.root;
    while (!nd.leaf) {
      const v = X[i * m.p + (nd.feat as number)];
      nd = v > (nd.threshold as number) ? (nd.right as TreeNode) : (nd.left as TreeNode);
    }
    out[i] = nd.value;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Random forest (bagged histogram trees)                              */
/* ------------------------------------------------------------------ */

export interface ForestModel {
  trees: TreeNode[];
  p: number;
}

export function fitForest(
  X: Float64Array,
  y: Float64Array,
  n: number,
  p: number,
  opts: TreeOptions & { nTrees: number }
): ForestModel {
  const rng = makeRng(opts.seed ?? 42);
  const mtry = opts.mtry ?? Math.max(1, Math.round(Math.sqrt(p)));
  const maxBins = opts.maxBins ?? 16;
  const trees: TreeNode[] = [];
  for (let t = 0; t < opts.nTrees; t++) {
    const boot: number[] = new Array(n);
    for (let i = 0; i < n; i++) boot[i] = Math.floor(rng() * n);
    const bins = fitBinEdges(X, boot, p, maxBins);
    trees.push(
      buildHistNode(X, y, boot, p, bins, 0, opts.maxDepth, opts.minLeaf, mtry, rng)
    );
  }
  return { trees, p };
}

export function predictForest(m: ForestModel, X: Float64Array, n: number): Float64Array {
  const out = new Float64Array(n);
  const tm: TreeModel = { root: m.trees[0], p: m.p };
  for (const tree of m.trees) {
    tm.root = tree;
    const pred = predictTree(tm, X, n);
    for (let i = 0; i < n; i++) out[i] += pred[i];
  }
  for (let i = 0; i < n; i++) out[i] /= m.trees.length;
  return out;
}

/* ------------------------------------------------------------------ */
/* Rule baselines                                                      */
/* ------------------------------------------------------------------ */

export function constantRate(trainY: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < trainY.length; i++) s += trainY[i];
  return s / Math.max(1, trainY.length);
}

/** Rule baseline (plan §6): failures ≥ 1 OR absences above train median. */
export function fitRiskRule(trainRows: Record<string, string | number>[]): { medianAbsences: number } {
  const ab = trainRows.map((r) => Number(r.absences)).sort((a, b) => a - b);
  const mid = Math.floor(ab.length / 2);
  const medianAbsences = ab.length % 2 ? ab[mid] : (ab[mid - 1] + ab[mid]) / 2;
  return { medianAbsences };
}

export function predictRiskRule(
  rows: Record<string, string | number>[],
  rule: { medianAbsences: number }
): Float64Array {
  const out = new Float64Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out[i] = Number(r.failures) >= 1 || Number(r.absences) > rule.medianAbsences ? 1 : 0;
  }
  return out;
}
