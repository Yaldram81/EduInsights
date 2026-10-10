/**
 * Logistic regression (L2, Newton–IRLS, additive-gradient form).
 *
 * Penalized log-likelihood (intercept unpenalized):
 *   ℓ(β) = Σ yᵢ log μᵢ + (1−yᵢ) log(1−μᵢ) − (λ/2) Σ_{j<p} βⱼ²
 *   ∇ℓ  = Xᵀ(y−μ) − λDβ          (D = diag(1..1,0))
 *   H   = XᵀWX + λD              (W = diag(μ(1−μ)))
 *   Newton: β ← β + H⁻¹ ∇ℓ
 */

import { solveSPD } from "./solve";

export interface LogisticModel {
  beta: Float64Array;
  intercept: number;
  p: number;
  converged: boolean;
  iterations: number;
}

export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-Math.min(35, z));
    return 1 / (1 + e);
  }
  const e = Math.exp(Math.max(-35, z));
  return e / (1 + e);
}

export function fitLogistic(
  X: Float64Array,
  y: Float64Array,
  n: number,
  p: number,
  lambda = 1.0,
  maxIter = 30
): LogisticModel {
  const q = p + 1;
  const beta = new Float64Array(q);
  const H = new Float64Array(q * q);
  const g = new Float64Array(q);
  const eta = new Float64Array(n);
  const mu = new Float64Array(n);
  const w = new Float64Array(n);
  let converged = false;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    // forward pass
    for (let i = 0; i < n; i++) {
      let z = beta[p];
      const off = i * p;
      for (let j = 0; j < p; j++) z += beta[j] * X[off + j];
      eta[i] = z;
      mu[i] = sigmoid(z);
      w[i] = Math.max(mu[i] * (1 - mu[i]), 1e-10);
    }
    // gradient g = Xᵀ(y−μ) − λDβ ; Hessian H = XᵀWX + λD
    H.fill(0);
    g.fill(0);
    for (let i = 0; i < n; i++) {
      const off = i * p;
      const wi = w[i];
      const ri = y[i] - mu[i];
      for (let j = 0; j <= p; j++) {
        const xj = j < p ? X[off + j] : 1;
        g[j] += xj * ri;
        const wj = wi * xj;
        for (let k = j; k <= p; k++) {
          const xk = k < p ? X[off + k] : 1;
          H[j * q + k] += wj * xk;
        }
      }
    }
    for (let j = 0; j < q; j++) {
      for (let k = 0; k < j; k++) H[j * q + k] = H[k * q + j];
      if (j < p) {
        H[j * q + j] += lambda;
        g[j] -= lambda * beta[j];
      }
    }
    const step = solveSPD(H, g, q);
    if (!step) break;
    let maxDelta = 0;
    for (let j = 0; j < q; j++) {
      const d = Math.abs(step[j]);
      if (d > maxDelta) maxDelta = d;
      beta[j] += step[j];
    }
    if (maxDelta < 1e-8) {
      converged = true;
      iter++;
      break;
    }
  }
  const b = new Float64Array(p);
  for (let j = 0; j < p; j++) b[j] = beta[j];
  return { beta: b, intercept: beta[p], p, converged, iterations: iter };
}

export function predictLogistic(m: LogisticModel, X: Float64Array, n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = m.intercept;
    const off = i * m.p;
    for (let j = 0; j < m.p; j++) z += m.beta[j] * X[off + j];
    out[i] = sigmoid(z);
  }
  return out;
}
