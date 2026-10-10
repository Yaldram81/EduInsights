/**
 * Dense symmetric positive-definite solver (Cholesky with jitter fallback).
 * Used by penalized IRLS and ridge closed forms (p ≤ ~60, so O(p³) is fine).
 */

export function solveSPD(A: Float64Array, b: Float64Array, n: number): Float64Array | null {
  for (let attempt = 0; attempt < 6; attempt++) {
    const jitter = attempt === 0 ? 0 : Math.pow(10, attempt - 1) * 1e-10;
    const M = Float64Array.from(A);
    if (jitter > 0) for (let i = 0; i < n; i++) M[i * n + i] += jitter;
    const L = new Float64Array(n * n);
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      for (let j = 0; j <= i; j++) {
        let s = M[i * n + j];
        for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
        if (i === j) {
          if (!(s > 1e-12)) {
            ok = false;
            break;
          }
          L[i * n + i] = Math.sqrt(s);
        } else {
          L[i * n + j] = s / L[j * n + j];
        }
      }
    }
    if (!ok) continue;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k];
      y[i] = s / L[i * n + i];
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
      x[i] = s / L[i * n + i];
    }
    return x;
  }
  return null;
}
