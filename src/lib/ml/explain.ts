/**
 * Explanations (plan §9 / design §10).
 *
 * - Linear models (logistic/ridge): exact additive contributions in
 *   standardized space, referenced to the training means — the exact SHAP
 *   value for a linear model under an independence reference.
 * - Trees/forests: path-based attributions (tree-interpreter, Saabas):
 *   prediction = root value + Σ path deltas attributed to the split feature.
 *   Labeled in the UI as an approximation of SHAP (honest, deterministic).
 * - Global importance: mean |contribution| over a seeded sample, or |β| for
 *   linear models (standardized space → directly comparable).
 * - Stability: top-k Jaccard + Kendall τ across refits (plan §9 stability).
 */

import type { TreeNode } from "./models";
import { rankData } from "./metrics";

export interface Contribution {
  /** output (encoded) column name */
  name: string;
  /** signed contribution in model-output units */
  value: number;
}

/* ------------------------------------------------------------------ */
/* Linear (exact for the model family)                                 */
/* ------------------------------------------------------------------ */

export function linearContributions(
  beta: ArrayLike<number>,
  x: ArrayLike<number>,
  means: ArrayLike<number>,
  names: string[]
): Contribution[] {
  const out: Contribution[] = [];
  for (let j = 0; j < beta.length; j++) {
    out.push({ name: names[j], value: beta[j] * (x[j] - means[j]) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Tree interpreter (Saabas path attributions)                         */
/* ------------------------------------------------------------------ */

/** Returns per-node accumulated attribution for one instance (row `i` of X). */
export function treePathContributions(root: TreeNode, X: ArrayLike<number>, p: number, i = 0): Float64Array {
  const contrib = new Float64Array(p);
  let node: TreeNode = root;
  while (!node.leaf) {
    const f = node.feat as number;
    const goRight = X[i * p + f] > (node.threshold as number);
    const child = goRight ? (node.right as TreeNode) : (node.left as TreeNode);
    contrib[f] += child.value - node.value;
    node = child;
  }
  return contrib;
}

/**
 * Global importance for tree ensembles: mean |contribution| per feature over
 * a seeded sample of rows (plan §9: aggregate one-hot back to raw features).
 */
export function forestGlobalImportance(
  trees: TreeNode[],
  X: Float64Array,
  n: number,
  p: number,
  sampleIdx: number[]
): number[] {
  const acc = new Float64Array(p);
  const contrib = new Float64Array(p);
  for (const i of sampleIdx) {
    contrib.fill(0);
    for (const tree of trees) {
      const c = treePathContributions(tree, X, p, i);
      for (let j = 0; j < p; j++) contrib[j] += Math.abs(c[j]);
    }
    for (let j = 0; j < p; j++) acc[j] += contrib[j] / trees.length;
  }
  const out: number[] = [];
  for (let j = 0; j < p; j++) out.push(acc[j] / Math.max(1, sampleIdx.length));
  return out;
}

/* ------------------------------------------------------------------ */
/* Permutation importance (model-agnostic, honest)                     */
/* ------------------------------------------------------------------ */

export function permutationImportance(
  predict: (X: Float64Array, rows: number) => Float64Array,
  X: Float64Array,
  y: ArrayLike<number>,
  n: number,
  p: number,
  metric: (yTrue: ArrayLike<number>, yPred: ArrayLike<number>) => number,
  rng: () => number,
  nPerms = 10
): number[] {
  const base = metric(y, predict(X, n));
  const imp = new Float64Array(p);
  const perm = new Int32Array(n);
  for (let t = 0; t < nPerms; t++) {
    for (let j = 0; j < p; j++) {
      // permute column j
      const idx = new Int32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      for (let i = n - 1; i > 0; i--) {
        const s = Math.floor(rng() * (i + 1));
        const tmpI = idx[i];
        idx[i] = idx[s];
        idx[s] = tmpI;
      }
      const Xp = Float64Array.from(X);
      for (let i = 0; i < n; i++) Xp[i * p + j] = X[idx[i] * p + j];
      const pred = predict(Xp, n);
      imp[j] += base - metric(y, pred);
    }
  }
  const out: number[] = [];
  for (let j = 0; j < p; j++) out.push(imp[j] / nPerms);
  return Array.from(out);
}

/* ------------------------------------------------------------------ */
/* Stability (plan §9 stability protocol)                              */
/* ------------------------------------------------------------------ */

export function topKSet(scores: ArrayLike<number>, k: number): Set<number> {
  const idx = Array.from({ length: scores.length }, (_, i) => i);
  idx.sort((a, b) => scores[b] - scores[a]);
  return new Set(idx.slice(0, Math.min(k, scores.length)));
}

/** Jaccard overlap of two top-k sets. */
export function jaccard(a: Set<number>, b: Set<number>): number {
  let inter = 0;
  for (const v of a) if (b.has(v)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 1;
}

/** Mean pairwise Jaccard across a list of top-k sets. */
export function meanPairwiseJaccard(sets: Set<number>[]): number {
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      sum += jaccard(sets[i], sets[j]);
      cnt++;
    }
  }
  return cnt > 0 ? sum / cnt : 1;
}

/** Kendall τ between two importance vectors (tie-corrected). */
export function kendallTau(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = a.length;
  if (n < 2) return 1;
  const ra = rankData(a);
  const rb = rankData(b);
  let conc = 0;
  let disc = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const da = ra[i] - ra[j];
      const db = rb[i] - rb[j];
      const s = da * db;
      if (s > 0) conc++;
      else if (s < 0) disc++;
    }
  }
  const denom = (n * (n - 1)) / 2;
  return denom > 0 ? (conc - disc) / denom : 1;
}
