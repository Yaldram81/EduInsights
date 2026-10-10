/**
 * Split-conformal uncertainty (plan §7.8, E8).
 *
 * - Probability interval: score = |y − p̂| on a held-out calibration split;
 *   q = ⌈(m+1)(1−α)⌉/m empirical quantile → interval [p̂−q, p̂+q] (clipped).
 * - Conformal set: score⁺ = 1−p̂ for label 1, score⁻ = p̂ for label 0;
 *   label ℓ enters the set iff score_ℓ ≤ q̂_set. A set spanning {0,1} is
 *   reported as "uncertain" (design §11.4).
 */

export interface ConformalCalibration {
  /** quantile of |y − p̂| for the interval */
  qInterval: number;
  /** quantile of the label scores for the conformal set */
  qSet: number;
  m: number;
  alpha: number;
}

function quantile(sorted: number[], q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Calibrate on held-out data. `alpha` = 1 − target coverage (0.1 → 90%).
 * Uses the conservative ⌈(m+1)(1−α)⌉/m order statistic (Vovk).
 */
export function calibrateConformal(
  yCal: ArrayLike<number>,
  pCal: ArrayLike<number>,
  alpha = 0.1
): ConformalCalibration {
  const m = yCal.length;
  const absResiduals: number[] = [];
  const labelScores: number[] = [];
  for (let i = 0; i < m; i++) {
    absResiduals.push(Math.abs(yCal[i] - pCal[i]));
    labelScores.push(yCal[i] === 1 ? 1 - pCal[i] : pCal[i]);
  }
  absResiduals.sort((a, b) => a - b);
  labelScores.sort((a, b) => a - b);
  const k = Math.min(m, Math.ceil((m + 1) * (1 - alpha)));
  const qLevel = k / m;
  return {
    qInterval: quantile(absResiduals, qLevel),
    qSet: quantile(labelScores, qLevel),
    m,
    alpha,
  };
}

/** 90% conformal interval around a predicted probability. */
export function conformalInterval(
  cal: ConformalCalibration,
  p: number
): [number, number] {
  const lo = Math.max(0, p - cal.qInterval);
  const hi = Math.min(1, p + cal.qInterval);
  return [lo, hi];
}

/** Conformal prediction set for the binary label. */
export function conformalSet(cal: ConformalCalibration, p: number): number[] {
  const set: number[] = [];
  // label 1: score = 1 − p ≤ q̂ ;  label 0: score = p ≤ q̂
  if (1 - p <= cal.qSet + 1e-12) set.push(1);
  if (p <= cal.qSet + 1e-12) set.push(0);
  return set.sort();
}

/**
 * Empirical coverage of the |y−p| interval over out-of-fold predictions
 * (plan §7.8: report empirical vs nominal coverage).
 */
export function empiricalCoverage(
  y: ArrayLike<number>,
  p: ArrayLike<number>,
  q: number
): number {
  let covered = 0;
  for (let i = 0; i < y.length; i++) {
    if (Math.abs(y[i] - p[i]) <= q + 1e-12) covered++;
  }
  return y.length ? covered / y.length : NaN;
}
