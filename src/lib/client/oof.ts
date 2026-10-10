/**
 * EduInsight AI — client-side derivations from out-of-fold predictions.
 * Everything here recomputes from raw OOF pairs (y, pred) returned by
 * /api/experiments/oof — no results are hardcoded anywhere.
 */

export interface ReliabilityBin {
  bin: number;
  predicted: number; // mean predicted probability in bin
  observed: number; // observed positive fraction in bin
  count: number;
}

/** Equal-width bins over [0, 1]; empty bins are dropped. */
export function reliabilityBins(y: number[], pred: number[], nBins = 10): ReliabilityBin[] {
  const sums = Array.from({ length: nBins }, () => ({ p: 0, o: 0, n: 0 }));
  for (let i = 0; i < y.length; i++) {
    const p = pred[i];
    if (!Number.isFinite(p)) continue;
    const b = Math.min(nBins - 1, Math.max(0, Math.floor(p * nBins)));
    const s = sums[b];
    s.p += p;
    s.o += y[i] === 1 ? 1 : 0;
    s.n += 1;
  }
  const bins: ReliabilityBin[] = [];
  for (let b = 0; b < nBins; b++) {
    const s = sums[b];
    if (s.n === 0) continue;
    bins.push({ bin: b, predicted: s.p / s.n, observed: s.o / s.n, count: s.n });
  }
  return bins;
}

/** Standard ECE: Σ (n_b / N) · |mean p_b − observed rate_b|. */
export function expectedCalibrationError(bins: ReliabilityBin[], n: number): number {
  if (!n) return Number.NaN;
  let ece = 0;
  for (const b of bins) ece += (b.count / n) * Math.abs(b.predicted - b.observed);
  return ece;
}

export interface DecisionPoint {
  threshold: number;
  model: number;
  all: number;
  none: number;
}

/**
 * Net-benefit decision curve, thresholds 0.05…0.95.
 * model: (TP − FP·t/(1−t)) / N · treat-all: prev − (1−prev)·t/(1−t) · treat-none: 0.
 */
export function decisionCurve(y: number[], pred: number[]): DecisionPoint[] {
  const n = y.length;
  if (!n) return [];
  const positives = y.reduce((acc, v) => acc + (v === 1 ? 1 : 0), 0);
  const prev = positives / n;
  const points: DecisionPoint[] = [];
  for (let t = 0.05; t <= 0.9501; t += 0.05) {
    let tp = 0;
    let fp = 0;
    for (let i = 0; i < n; i++) {
      if (pred[i] >= t) {
        if (y[i] === 1) tp += 1;
        else fp += 1;
      }
    }
    points.push({
      threshold: Math.round(t * 100) / 100,
      model: (tp - fp * (t / (1 - t))) / n,
      all: prev - (1 - prev) * (t / (1 - t)),
      none: 0,
    });
  }
  return points;
}

/** Contiguous threshold ranges where the model beats treat-all and treat-none. */
export function usefulThresholdRanges(points: DecisionPoint[]): [number, number][] {
  const ranges: [number, number][] = [];
  let start: number | null = null;
  let last: number | null = null;
  for (const p of points) {
    const wins = p.model >= p.all && p.model >= p.none;
    if (wins) {
      if (start == null) start = p.threshold;
      last = p.threshold;
    } else if (start != null && last != null) {
      ranges.push([start, last]);
      start = null;
      last = null;
    }
  }
  if (start != null && last != null) ranges.push([start, last]);
  return ranges;
}

export interface TopKPoint {
  k: number; // percent, 5…30
  precision: number;
  recall: number;
  flagged: number; // n · k
}

/** Precision & recall among the top-k% highest scores, k = 5…30. */
export function precisionAtKCurve(y: number[], pred: number[]): TopKPoint[] {
  const n = y.length;
  if (!n) return [];
  const positives = y.reduce((acc, v) => acc + (v === 1 ? 1 : 0), 0);
  const order = pred
    .map((p, i) => ({ p, y: y[i] }))
    .sort((a, b) => b.p - a.p || b.y - a.y);
  const points: TopKPoint[] = [];
  for (let k = 5; k <= 30; k++) {
    const top = Math.max(1, Math.round((n * k) / 100));
    let tp = 0;
    for (let i = 0; i < Math.min(top, n); i++) tp += order[i].y === 1 ? 1 : 0;
    points.push({
      k,
      precision: tp / top,
      recall: positives ? tp / positives : 0,
      flagged: top,
    });
  }
  return points;
}
