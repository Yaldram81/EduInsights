"use client";

/**
 * EduInsight AI — client-side analysis on out-of-fold predictions.
 * Pure functions over {y, pred} vectors returned by /api/experiments/oof.
 * Classification: reliability bins + ECE, precision/recall @k, net-benefit
 * decision curve. Nothing here invents numbers.
 */

export interface ReliabilityBin {
  meanPred: number;
  fracPos: number;
  count: number;
}

/** Equal-width probability bins + ECE (|meanPred − fracPos| weighted). */
export function binReliability(
  y: number[],
  pred: number[],
  nBins = 10,
): { bins: ReliabilityBin[]; ece: number } {
  const n = Math.min(y.length, pred.length);
  const bins: ReliabilityBin[] = [];
  let ece = 0;
  for (let b = 0; b < nBins; b += 1) {
    const lo = b / nBins;
    const hi = (b + 1) / nBins;
    let count = 0;
    let sumPred = 0;
    let sumY = 0;
    for (let i = 0; i < n; i += 1) {
      const inBin = pred[i] >= lo && (b === nBins - 1 ? pred[i] <= hi : pred[i] < hi);
      if (inBin) {
        count += 1;
        sumPred += pred[i];
        sumY += y[i];
      }
    }
    if (count === 0) {
      bins.push({ meanPred: (lo + hi) / 2, fracPos: 0, count: 0 });
      continue;
    }
    const meanPred = sumPred / count;
    const fracPos = sumY / count;
    ece += (count / n) * Math.abs(meanPred - fracPos);
    bins.push({ meanPred, fracPos, count });
  }
  return { bins, ece };
}

export interface PrecisionRecallAtK {
  k: number;
  precision: number;
  recall: number;
}

/** Precision/recall in the top-k highest-scored rows, k = 5..30. */
export function precisionRecallAtK(y: number[], pred: number[]): PrecisionRecallAtK[] {
  const n = Math.min(y.length, pred.length);
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => pred[b] - pred[a]);
  const totalPos = y.reduce((s, v) => s + (v === 1 ? 1 : 0), 0);
  const out: PrecisionRecallAtK[] = [];
  let pos = 0;
  for (let k = 1; k <= Math.min(30, n); k += 1) {
    if (y[idx[k - 1]] === 1) pos += 1;
    if (k >= 5) {
      out.push({
        k,
        precision: pos / k,
        recall: totalPos > 0 ? pos / totalPos : 0,
      });
    }
  }
  return out;
}

export interface DecisionPoint {
  threshold: number;
  nbModel: number;
  nbAll: number;
}

/**
 * Net benefit at threshold t:
 *   model: TP/n − FP/n · t/(1−t)   treat-all: prevalence − (1−prevalence)·t/(1−t)
 * Computed on the pooled OOF vector.
 */
export function decisionCurve(y: number[], pred: number[], steps = 21): DecisionPoint[] {
  const n = Math.min(y.length, pred.length);
  const prevalence = y.reduce((s, v) => s + (v === 1 ? 1 : 0), 0) / n;
  const out: DecisionPoint[] = [];
  for (let s = 0; s < steps; s += 1) {
    const t = s / (steps - 1);
    if (t >= 0.999) break;
    let tp = 0;
    let fp = 0;
    for (let i = 0; i < n; i += 1) {
      if (pred[i] >= t) {
        if (y[i] === 1) tp += 1;
        else fp += 1;
      }
    }
    out.push({
      threshold: t,
      nbModel: tp / n - (fp / n) * (t / (1 - t)),
      nbAll: prevalence - (1 - prevalence) * (t / (1 - t)),
    });
  }
  return out;
}

/** Pooled OOF prevalence — used by the decision curve caption. */
export function prevalence(y: number[]): number {
  if (y.length === 0) return 0;
  return y.reduce((s, v) => s + (v === 1 ? 1 : 0), 0) / y.length;
}
