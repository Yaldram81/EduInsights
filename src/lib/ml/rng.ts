/**
 * Deterministic seeded RNG utilities.
 * Every stochastic step in the pipeline (fold shuffles, bootstrap, forests)
 * draws from a seeded generator so identical seeds reproduce identical results.
 */

/** mulberry32 — small, fast, deterministic PRNG. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle of 0..n-1 (returns a new array). */
export function shuffledIndices(n: number, rng: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  return idx;
}

/** Sample `n` indices with replacement (bootstrap). */
export function bootstrapIndices(n: number, rng: () => number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = Math.floor(rng() * n);
  return out;
}

/** Random subsample of `k` indices without replacement. */
export function sampleIndices(n: number, k: number, rng: () => number): number[] {
  const idx = shuffledIndices(n, rng);
  return idx.slice(0, Math.min(k, n));
}
