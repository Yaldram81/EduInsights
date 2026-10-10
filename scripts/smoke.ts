/* Smoke tests for the ML core — run with: bun scripts/smoke.ts */
import { fitLogistic, predictLogistic, fitRidge, fitTree, predictTree, fitForest, predictForest, fitRiskRule, predictRiskRule, constantRate } from "../src/lib/ml/models";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main() {
  const n = 400;
  const X = new Float64Array(n * 2);
  const y = new Float64Array(n);
  const rng = mulberry(12345);
  for (let i = 0; i < n; i++) {
    const x1 = rng() - 0.5;
    const x2 = rng() - 0.5;
    X[i * 2] = x1;
    X[i * 2 + 1] = x2;
    const p = 1 / (1 + Math.exp(-(2 * x1 - 1)));
    y[i] = rng() < p ? 1 : 0;
  }

  const m = fitLogistic(X, y, n, 2);
  console.log(
    "logistic beta:",
    Array.from(m.beta).map((v) => v.toFixed(3)),
    "int:",
    m.intercept.toFixed(3),
    "iters:",
    m.iterations,
    "conv:",
    m.converged
  );
  const pred = predictLogistic(m, X, n);
  let acc = 0;
  let brier = 0;
  for (let i = 0; i < n; i++) {
    acc += (pred[i] > 0.5 ? 1 : 0) === y[i] ? 1 : 0;
    brier += (pred[i] - y[i]) * (pred[i] - y[i]);
  }
  console.log("train acc:", (acc / n).toFixed(3), "brier:", (brier / n).toFixed(3));

  const ridge = fitRidge(X, y, n, 2, 0.01);
  console.log("ridge(0.01):", Array.from(ridge.beta).map((v) => v.toFixed(3)), "int:", ridge.intercept.toFixed(3));

  const tree = fitTree(X, y, n, 2, { maxDepth: 3, minLeaf: 10, seed: 1 });
  const tp = predictTree(tree, X, n);
  let tacc = 0;
  for (let i = 0; i < n; i++) tacc += (tp[i] > 0.5 ? 1 : 0) === y[i] ? 1 : 0;
  console.log("tree acc:", (tacc / n).toFixed(3), "root.n:", tree.root.n);

  const forest = fitForest(X, y, n, 2, { nTrees: 15, maxDepth: 5, minLeaf: 5, seed: 1 });
  const fp = predictForest(forest, X, n);
  let facc = 0;
  for (let i = 0; i < n; i++) facc += (fp[i] > 0.5 ? 1 : 0) === y[i] ? 1 : 0;
  console.log("forest acc:", (facc / n).toFixed(3), "trees:", forest.trees.length);

  const rule = fitRiskRule([
    { absences: 2, failures: 0 },
    { absences: 8, failures: 1 },
    { absences: 4, failures: 0 },
  ]);
  const rp = predictRiskRule(
    [
      { absences: 3, failures: 0 },
      { absences: 9, failures: 0 },
      { absences: 1, failures: 2 },
    ],
    rule
  );
  console.log("rule median:", rule.medianAbsences, "flags:", Array.from(rp));
  console.log("const rate:", constantRate(y).toFixed(3));
}

main();
