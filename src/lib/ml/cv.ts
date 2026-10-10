/**
 * Repeated stratified grouped cross-validation (plan §7.3–7.5).
 *
 * StratifiedGroupKFold: greedy group→fold assignment that minimizes stratum
 * imbalance while keeping every student group inside exactly one fold.
 * Identical (seed, k) → identical folds across tiers and model families, so
 * all comparisons are paired by fold (plan §7.5).
 */

import { makeRng, shuffledIndices } from "./rng";

export interface FoldAssignment {
  /** fold index per row */
  assign: Int32Array;
  k: number;
}

/**
 * Assign rows to k folds. Groups are shuffled once, then each group is placed
 * in the fold where its strata are currently least represented (ties →
 * smallest fold). Guarantees: (1) no group spans train and test; (2) strata
 * are approximately balanced across folds.
 */
export function stratifiedGroupKFold(
  groups: number[],
  strata: number[],
  k: number,
  seed: number
): FoldAssignment {
  const n = groups.length;
  const assign = new Int32Array(n).fill(-1);
  const rowIdsByGroup = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    let arr = rowIdsByGroup.get(groups[i]);
    if (!arr) {
      arr = [];
      rowIdsByGroup.set(groups[i], arr);
    }
    arr.push(i);
  }
  const gids = Array.from(rowIdsByGroup.keys());
  const rng = makeRng(seed);
  const order = shuffledIndices(gids.length, rng);

  // fold state: total rows, per-stratum rows
  const foldTotal = new Int32Array(k);
  const foldStrata: Map<number, number>[] = Array.from({ length: k }, () => new Map());

  for (const gi of order) {
    const rows = rowIdsByGroup.get(gids[gi]) as number[];
    // stratum histogram of the group
    const hist = new Map<number, number>();
    for (const i of rows) hist.set(strata[i], (hist.get(strata[i]) ?? 0) + 1);

    let bestFold = 0;
    let bestScore = Infinity;
    for (let f = 0; f < k; f++) {
      // score: weighted stratum deficit this group would add
      let score = foldTotal[f] * 0.01;
      for (const [s, c] of hist) {
        // want folds where this stratum is least represented
        score += c * (foldStrata[f].get(s) ?? 0);
      }
      if (score < bestScore) {
        bestScore = score;
        bestFold = f;
      }
    }
    for (const i of rows) assign[i] = bestFold;
    foldTotal[bestFold] += rows.length;
    for (const [s, c] of hist) {
      foldStrata[bestFold].set(s, (foldStrata[bestFold].get(s) ?? 0) + c);
    }
  }
  // safety: every row assigned
  for (let i = 0; i < n; i++) if (assign[i] < 0) assign[i] = 0;
  return { assign, k };
}

/** Leakage guard (plan §11): no group may appear in both train and test. */
export function assertGroupDisjoint(groups: number[], assign: Int32Array, fold: number): void {
  const trainGroups = new Set<number>();
  const testGroups = new Set<number>();
  for (let i = 0; i < groups.length; i++) {
    if (assign[i] === fold) testGroups.add(groups[i]);
    else trainGroups.add(groups[i]);
  }
  for (const g of testGroups) {
    if (trainGroups.has(g)) throw new Error("Leakage: group present in both train and test");
  }
}
