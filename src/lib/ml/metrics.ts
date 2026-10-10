/**
 * Metrics — plan §7.6. Every function operates on plain arrays/typed arrays.
 * Constant-score inputs yield null for rank-based metrics (reported as "—").
 */

export interface ClassMetrics {
  prAuc: number | null;
  rocAuc: number | null;
  balancedAcc: number | null;
  mcc: number | null;
  precisionAtK: number | null;
  recallAtK: number | null;
  brier: number | null;
  ece: number | null;
  accuracy: number | null;
}

export interface RegMetrics {
  mae: number;
  rmse: number;
  r2: number;
  spearman: number | null;
}

const mean = (a: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
};

/* ------------------------------------------------------------------ */
/* Rank helpers                                                        */
/* ------------------------------------------------------------------ */

/** Average ranks with tie handling (1-based). */
export function rankData(a: ArrayLike<number>): Float64Array {
  const n = a.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((i, j) => a[i] - a[j]);
  const ranks = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && a[idx[j + 1]] === a[idx[i]]) j++;
    const r = (i + j + 2) / 2; // average of ranks i+1..j+1
    for (let k = i; k <= j; k++) ranks[idx[k]] = r;
    i = j + 1;
  }
  return ranks;
}

/* ------------------------------------------------------------------ */
/* Classification metrics                                              */
/* ------------------------------------------------------------------ */

/** ROC AUC via the Mann–Whitney U statistic with tie handling. */
export function rocAuc(yTrue: ArrayLike<number>, yScore: ArrayLike<number>): number | null {
  const n = yTrue.length;
  let nPos = 0;
  let nNeg = 0;
  for (let i = 0; i < n; i++) {
    if (yTrue[i] === 1) nPos++;
    else nNeg++;
  }
  if (nPos === 0 || nNeg === 0) return null;
  const r = rankData(yScore);
  let sumPosRanks = 0;
  for (let i = 0; i < n; i++) if (yTrue[i] === 1) sumPosRanks += r[i];
  const u = sumPosRanks - (nPos * (nPos + 1)) / 2;
  return u / (nPos * nNeg);
}

/** Average precision (step-wise PR AUC). Null when the positive class is absent. */
export function prAuc(yTrue: ArrayLike<number>, yScore: ArrayLike<number>): number | null {
  const n = yTrue.length;
  const order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => yScore[b] - yScore[a]);
  let nPos = 0;
  for (let i = 0; i < n; i++) if (yTrue[i] === 1) nPos++;
  if (nPos === 0) return null;
  let tp = 0;
  let ap = 0;
  let prevRecall = 0;
  for (let k = 0; k < n; k++) {
    const i = order[k];
    if (yTrue[i] === 1) {
      tp++;
      const recall = tp / nPos;
      const precision = tp / (k + 1);
      ap += (recall - prevRecall) * precision;
      prevRecall = recall;
    }
  }
  return ap;
}

/** Expected calibration error, 10 equal-width bins (plan §12.6). */
export function expectedCalibrationError(
  yTrue: ArrayLike<number>,
  yProb: ArrayLike<number>,
  nBins = 10
): number {
  const n = yTrue.length;
  const binIds = new Int32Array(n);
  const binCount = new Float64Array(nBins);
  const binSumP = new Float64Array(nBins);
  const binSumY = new Float64Array(nBins);
  for (let i = 0; i < n; i++) {
    let b = Math.min(nBins - 1, Math.max(0, Math.floor(yProb[i] * nBins)));
    binIds[i] = b;
    binCount[b]++;
    binSumP[b] += yProb[i];
    binSumY[b] += yTrue[i];
  }
  let ece = 0;
  for (let b = 0; b < nBins; b++) {
    if (binCount[b] === 0) continue;
    const conf = binSumP[b] / binCount[b];
    const acc = binSumY[b] / binCount[b];
    ece += (binCount[b] / n) * Math.abs(acc - conf);
  }
  return ece;
}

/** Brier score on the positive-class probability. */
export function brierScore(yTrue: ArrayLike<number>, yProb: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const d = yProb[i] - yTrue[i];
    s += d * d;
  }
  return s / yTrue.length;
}

export function confusionAtThreshold(
  yTrue: ArrayLike<number>,
  yProb: ArrayLike<number>,
  threshold = 0.5
): { tp: number; fp: number; tn: number; fn: number } {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const pred = yProb[i] >= threshold ? 1 : 0;
    if (yTrue[i] === 1 && pred === 1) tp++;
    else if (yTrue[i] === 0 && pred === 1) fp++;
    else if (yTrue[i] === 0 && pred === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

export function balancedAccuracy(
  yTrue: ArrayLike<number>,
  yProb: ArrayLike<number>,
  threshold = 0.5
): number | null {
  const { tp, fp, tn, fn } = confusionAtThreshold(yTrue, yProb, threshold);
  const tpr = tp + fn > 0 ? tp / (tp + fn) : null;
  const tnr = tn + fp > 0 ? tn / (tn + fp) : null;
  if (tpr === null || tnr === null) return null;
  return (tpr + tnr) / 2;
}

export function matthewsCorrCoef(
  yTrue: ArrayLike<number>,
  yProb: ArrayLike<number>,
  threshold = 0.5
): number | null {
  const { tp, fp, tn, fn } = confusionAtThreshold(yTrue, yProb, threshold);
  const denom = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  if (denom === 0) return null;
  return (tp * tn - fp * fn) / denom;
}

/** Precision / recall among the top k fraction of scores. */
export function topKMetrics(
  yTrue: ArrayLike<number>,
  yScore: ArrayLike<number>,
  frac: number
): { precisionAtK: number | null; recallAtK: number | null; k: number } {
  const n = yTrue.length;
  const k = Math.max(1, Math.ceil(frac * n));
  const order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => yScore[b] - yScore[a]);
  let tp = 0;
  let totalPos = 0;
  for (let i = 0; i < n; i++) if (yTrue[i] === 1) totalPos++;
  for (let i = 0; i < k; i++) if (yTrue[order[i]] === 1) tp++;
  return {
    precisionAtK: totalPos > 0 ? tp / k : null,
    recallAtK: totalPos > 0 ? tp / totalPos : null,
    k,
  };
}

export function classifyMetrics(yTrue: ArrayLike<number>, yProb: ArrayLike<number>): ClassMetrics {
  let nPos = 0;
  for (let i = 0; i < yTrue.length; i++) if (yTrue[i] === 1) nPos++;
  const constant = new Set<number>();
  for (let i = 0; i < yProb.length; i++) constant.add(yProb[i]);
  const degenerate = constant.size <= 1;
  const topK = topKMetrics(yTrue, yProb, 0.1);
  const acc = (() => {
    let c = 0;
    for (let i = 0; i < yTrue.length; i++) if ((yProb[i] >= 0.5 ? 1 : 0) === yTrue[i]) c++;
    return c / yTrue.length;
  })();
  return {
    prAuc: nPos > 0 ? prAuc(yTrue, yProb) : null,
    rocAuc: rocAuc(yTrue, yProb),
    balancedAcc: balancedAccuracy(yTrue, yProb),
    mcc: matthewsCorrCoef(yTrue, yProb),
    precisionAtK: topK.precisionAtK,
    recallAtK: topK.recallAtK,
    brier: brierScore(yTrue, yProb),
    ece: expectedCalibrationError(yTrue, yProb),
    accuracy: acc,
  };
}

/* ------------------------------------------------------------------ */
/* Regression metrics                                                  */
/* ------------------------------------------------------------------ */

export function spearmanRho(a: ArrayLike<number>, b: ArrayLike<number>): number | null {
  const n = a.length;
  if (n < 2) return null;
  const ra = rankData(a);
  const rb = rankData(b);
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = ra[i] - ma;
    const y = rb[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const denom = Math.sqrt(da * db);
  return denom > 0 ? num / denom : null;
}

export function regressionMetrics(yTrue: ArrayLike<number>, yPred: ArrayLike<number>): RegMetrics {
  const n = yTrue.length;
  let sae = 0, sse = 0, meanY = 0;
  for (let i = 0; i < n; i++) {
    const d = yPred[i] - yTrue[i];
    sae += Math.abs(d);
    sse += d * d;
    meanY += yTrue[i];
  }
  meanY /= n;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const d = yTrue[i] - meanY;
    sst += d * d;
  }
  return {
    mae: sae / n,
    rmse: Math.sqrt(sse / n),
    r2: sst > 0 ? 1 - sse / sst : 0,
    spearman: spearmanRho(yTrue, yPred),
  };
}

/* ------------------------------------------------------------------ */
/* Calibration curve (reliability diagram)                             */
/* ------------------------------------------------------------------ */

export interface ReliabilityBin {
  binLo: number;
  binHi: number;
  count: number;
  meanPred: number;
  fracPos: number;
}

export function reliabilityCurve(
  yTrue: ArrayLike<number>,
  yProb: ArrayLike<number>,
  nBins = 10
): ReliabilityBin[] {
  const bins: ReliabilityBin[] = [];
  for (let b = 0; b < nBins; b++) {
    bins.push({ binLo: b / nBins, binHi: (b + 1) / nBins, count: 0, meanPred: 0, fracPos: 0 });
  }
  for (let i = 0; i < yTrue.length; i++) {
    const b = Math.min(nBins - 1, Math.max(0, Math.floor(yProb[i] * nBins)));
    const bin = bins[b];
    bin.count++;
    bin.meanPred += yProb[i];
    bin.fracPos += yTrue[i];
  }
  for (const bin of bins) {
    if (bin.count > 0) {
      bin.meanPred /= bin.count;
      bin.fracPos /= bin.count;
    }
  }
  return bins;
}

/* ------------------------------------------------------------------ */
/* Statistics for hypothesis tests                                     */
/* ------------------------------------------------------------------ */

/**
 * Nadeau–Bengio corrected resampled t-test (plan §12.5).
 * `diffs` — per-split metric differences between two models.
 */
export function correctedResampledTTest(
  diffs: number[],
  nTrain: number,
  nTest: number
): { t: number; p: number; meanDiff: number } {
  const k = diffs.length;
  if (k < 2) return { t: NaN, p: 1, meanDiff: NaN };
  let m = 0;
  for (const d of diffs) m += d;
  m /= k;
  let v = 0;
  for (const d of diffs) v += (d - m) * (d - m);
  v /= k - 1;
  const correctedVar = (1 / k + nTest / nTrain) * v;
  const t = correctedVar > 0 ? m / Math.sqrt(correctedVar) : 0;
  const p = 2 * tDistSf(Math.abs(t), k - 1);
  return { t, p, meanDiff: m };
}

/** Student-t survival function via incomplete beta (regularized). */
export function tDistSf(t: number, df: number): number {
  if (!isFinite(t)) return t > 0 ? 0 : 1;
  const x = df / (df + t * t);
  const ib = incompleteBeta(df / 2, 0.5, x);
  return ib / 2;
}

/** Regularized incomplete beta I_x(a,b) via continued fractions. */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContFrac(a, b, x)) / a;
  }
  return 1 - (bt * betaContFrac(b, a, 1 - x)) / b;
}

function betaContFrac(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Lanczos log-gamma. */
export function logGamma(x: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let a = 0.99999999999980993;
  const t = z + 7.5;
  for (let i = 0; i < 8; i++) a += g[i] / (z + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Normal CDF. */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Holm–Bonferroni step-down adjustment (plan §7.5). */
export function holmAdjust(pvals: number[]): number[] {
  const n = pvals.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => pvals[a] - pvals[b]);
  const adj = new Array<number>(n).fill(0);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const idx = order[i];
    const v = Math.min(1, (n - i) * pvals[idx]);
    prev = Math.max(prev, v);
    adj[idx] = prev;
  }
  return adj;
}

/** Benjamini–Hochberg FDR adjustment (plan §8). */
export function bhAdjust(pvals: number[]): number[] {
  const n = pvals.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => pvals[b] - pvals[a]);
  const adj = new Array<number>(n).fill(0);
  let prev = 1;
  for (let i = 0; i < n; i++) {
    const idx = order[i];
    const v = Math.min(prev, (pvals[idx] * n) / (n - i));
    adj[idx] = v;
    prev = v;
  }
  return adj;
}

/** Mean and 95% CI of an array via normal approximation (or t when small). */
export function meanAndCi(vals: number[]): { mean: number; sd: number; ci: [number, number] } {
  const n = vals.length;
  const m = mean(vals);
  const sd = Math.sqrt(
    n > 1 ? vals.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1) : 0
  );
  if (n < 2) return { mean: m, sd, ci: [m, m] };
  const tcrit = tCrit975(n - 1);
  const half = (tcrit * sd) / Math.sqrt(n);
  return { mean: m, sd, ci: [m - half, m + half] };
}

/** Two-sided 97.5% t critical value (normal approx fallback). */
function tCrit975(df: number): number {
  // Simple interpolation table for common df; fallback to 1.96
  const table: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
    8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145,
    15: 2.131, 16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086, 25: 2.06,
    30: 2.042, 40: 2.021, 50: 2.009, 60: 2.0, 100: 1.984,
  };
  if (table[df] !== undefined) return table[df];
  if (df > 100) return 1.96;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df > keys[i] && df < keys[i + 1]) {
      const t = (df - keys[i]) / (keys[i + 1] - keys[i]);
      return table[keys[i]] * (1 - t) + table[keys[i + 1]] * t;
    }
  }
  return 1.96;
}
